import fs from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import "dotenv/config";
import { downloadStylesFiles } from "./style-cloner.js";
import { extractAndRemove } from "./extract-and-remove-zip.js";
import { editOriginalFiles } from "./palette-converter.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const stylesDirectory = path.join(__dirname, "..", "styles");

// Clean folder where the styles will be placed

fs.readdir(stylesDirectory, (err, files) => {
  if (err) throw err;

  for (const file of files) {
    let filePath = path.join(stylesDirectory, file);
    fs.stat(filePath, (err, stats) => {
      if (err) throw err;
      if (stats.isDirectory()) {
        fs.rm(filePath, { recursive: true, force: true }, (err) => {
          if (err) throw err;
        });
      } else {
        fs.unlink(filePath, (err) => {
          if (err) throw err;
        });
      }
    });
  }
});

// Get the styles from the Catppuccin usertyles repo as a zip file

downloadStylesFiles("https://github.com/catppuccin/userstyles/tree/main/styles")
  .then(() => {
    // Extract the files and remove the zip file
    extractAndRemove();
  })
  .catch((err) => {
    console.error(err);
  });

// Edit the palette of the original files

editOriginalFiles();

