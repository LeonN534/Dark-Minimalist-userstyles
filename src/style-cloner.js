import saveFile from "save-file";
import listContent from "list-github-dir-content";
import pMap from "p-map";
import pRetry from "p-retry";
import JSZip from "jszip";

/* 

  This is an unoptimzed version of the https://github.com/download-directory/download-directory.github.io
  downloader script. It produces some memory leaks and replaces blob converting with arraybuffer, but it works.
  It is open form improvements :)

*/

// Matches '/<re/po>/tree/<ref>/<dir>'
const urlParserRegex = /^[/]([^/]+)[/]([^/]+)[/]tree[/]([^/]+)[/](.*)/;
const globalZip = new JSZip();

async function maybeResponseLfs(response) {
  const length = Number(response.headers.get("content-length"));
  if (length > 128 && length < 140) {
    const contents = await response.clone().text();
    return contents.startsWith("version https://git-lfs.github.com/spec/v1");
  }
}

async function repoListingSlashblanchSupport(ref, dir, repoListingConfig) {
  let files;
  const dirParts = decodeURIComponent(dir).split("/");
  while (dirParts.length >= 0) {
    try {
      files = await listContent.viaTreesApi(repoListingConfig); // eslint-disable-line no-await-in-loop
      break;
    } catch (error) {
      if (error.message === "Not Found") {
        ref += "/" + dirParts.shift();
        repoListingConfig.directory = dirParts.join("/");
        repoListingConfig.ref = ref;
      } else {
        throw error;
      }
    }
  }

  if (files.length === 0 && files.truncated) {
    updateStatus(
      'Warning: It’s a large repo and this it take a long while just to download the list of files. You might want to use "git sparse checkout" instead.'
    );
    files = await listContent.viaContentsApi(repoListingConfig);
  }

  return [files, ref];
}

function updateStatus(status, ...extra) {
  console.log(status, ...extra);
}

async function waitForToken() {
  const input = {
    value: process.env.GITHUB_API_TOKEN,
  };
}

async function fetchRepoInfo(repo) {
  const response = await fetch(
    `https://api.github.com/repos/${repo}`,
    process.env.GITHUB_API_TOKEN
      ? {
          headers: {
            Authorization: `Bearer ${process.env.GITHUB_API_TOKEN}`,
          },
        }
      : {}
  );

  switch (response.status) {
    case 401: {
      updateStatus("⚠ The token provided is invalid or has been revoked.", {
        token: localStorage.token,
      });
      throw new Error("Invalid token");
    }

    case 403: {
      // See https://developer.github.com/v3/#rate-limiting
      if (response.headers.get("X-RateLimit-Remaining") === "0") {
        updateStatus("⚠ Your token rate limit has been exceeded.", {
          token: localStorage.token,
        });
        throw new Error("Rate limit exceeded");
      }

      break;
    }

    case 404: {
      updateStatus("⚠ Repository was not found.", { repo });
      throw new Error("Repository not found");
    }

    default:
  }

  if (!response.ok) {
    updateStatus("⚠ Could not obtain repository data from the GitHub API.", {
      repo,
      response,
    });
    throw new Error("Fetch error");
  }

  return response.json();
}

function escapeFilepath(path) {
  return path.replaceAll("#", "%23");
}

export async function downloadStylesFiles(mainUrl) {
  let user;
  let repository;
  let ref;
  let dir;

  const input = {
    value: process.env.GITHUB_API_TOKEN,
  };

  try {
    const parsedUrl = new URL(mainUrl);
    [, user, repository, ref, dir] = urlParserRegex.exec(parsedUrl.pathname);

    console.log("Source:", { user, repository, ref, dir });
  } catch {
    return updateStatus();
  }

  updateStatus(
    `Retrieving directory info \nRepo: ${user}/${repository}\nDirectory: /${dir}`
  );

  const { private: repoIsPrivate } = await fetchRepoInfo(
    `${user}/${repository}`
  );

  const repoListingConfig = {
    user,
    repository,
    ref,
    directory: decodeURIComponent(dir),
    token: process.env.GITHUB_API_TOKEN,
    getFullData: true,
  };
  let files;
  [files, ref] = await repoListingSlashblanchSupport(
    ref,
    dir,
    repoListingConfig
  );

  if (files.length === 0) {
    updateStatus("No files to download");
    return;
  }

  updateStatus(`Will download ${files.length} files`);

  const controller = new AbortController();

  const fetchPublicFile = async (file) => {
    const response = await fetch(
      `https://raw.githubusercontent.com/${user}/${repository}/${ref}/${escapeFilepath(
        file.path
      )}`,
      {
        signal: controller.signal,
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.statusText} for ${file.path}`);
    }

    const lfsCompatibleResponse = (await maybeResponseLfs(response))
      ? await fetch(
          `https://media.githubusercontent.com/media/${user}/${repository}/${ref}/${escapeFilepath(
            file.path
          )}`,
          {
            signal: controller.signal,
          }
        )
      : response;

    if (!response.ok) {
      throw new Error(`HTTP ${response.statusText} for ${file.path}`);
    }
    return lfsCompatibleResponse.arrayBuffer();
  };

  const fetchPrivateFile = async (file) => {
    const response = await fetch(file.url, {
      headers: {
        Authorization: `Bearer ${localStorage.token}`,
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.statusText} for ${file.path}`);
    }

    const { content } = await response.json();
    const decoder = await fetch(
      `data:application/octet-stream;base64,${content}`
    );
    return decoder.arrayBuffer();
  };

  let downloaded = 0;

  const downloadFile = async (file) => {
    const localDownload = () => fetchPublicFile(file);
    const onFailedAttempt = (error) => {
      console.error(
        `Error downloading ${file.url}. Attempt ${error.attemptNumber}. ${error.retriesLeft} retries left.`
      );
    };

    const blob = await pRetry(localDownload, { onFailedAttempt });
    downloaded++;
    updateStatus(file.path);

    globalZip.file(file.path.replace(dir + "/", ""), blob, {
      binary: true,
    });
  };

  if (repoIsPrivate) {
    await waitForToken();
  }

  await pMap(files, downloadFile, { concurrency: 20 }).catch((error) => {
    controller.abort();

    if (!navigator.onLine) {
      updateStatus("⚠ Could not download all files, network connection lost.");
    } else if (error.message.startsWith("HTTP ")) {
      updateStatus("⚠ Could not download all files.");
    } else {
      updateStatus(
        "⚠ Some files were blocked from downloading, try to disable any ad blockers and refresh the page."
      );
    }

    throw error;
  });

  updateStatus(`Zipping ${downloaded} files`);

  const zipBlob = await globalZip.generateAsync({
    type: "arraybuffer",
  });

  await saveFile(zipBlob, `styles/userstyles.zip`);
  updateStatus(`Downloaded ${downloaded} files! Done!`);
}
