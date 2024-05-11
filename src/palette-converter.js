import fs from "fs/promises";
import { glob } from "glob";
import path, { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const stylesDir = path.join(__dirname, "..", "styles");
const newFileName = "dark-minimalist.user.css";

export async function editOriginalFiles() {
  // Use glob to find all .user.css files in the styles directory
  try {
    // Use glob to find all .user.css files in the styles directory
    const files = await glob(`${stylesDir}/**/*.user.css`);
    console.log("a");

    for (const file of files) {
      try {
        propertyEditor(file).catch((err) => {
          console.error(err);
        });
        console.log(`Replaced content of ${file}`);
      } catch (err) {
        console.error(`Error writing to file ${file}:`, err);
      }
    }
  } catch (err) {
    console.error("Error finding files:", err);
  }
}

async function propertyEditor(filePath) {
  let dir = path.dirname(filePath);
  const newFilePath = path.join(dir, newFileName);

  // Read the file
  const data = await fs.readFile(filePath, "utf-8");

  // Split the file into lines
  const lines = data.split("\n");

  // Split the second line into words
  const words = lines[1].split(" ");

  // Replace the last word of the second line
  words[words.length - 1] = "Dark-Minimalist";

  // Join the words back into the second line
  lines[1] = words.join(" ");

  // Replace 'catppuccin/userstyles' with 'LeonN534/Dark-Minimalist-userstyles' in the third, forth, sixth and seventh line
  lines[2] = lines[2].replace(
    "catppuccin/userstyles",
    "LeonN534/Dark-Minimalist-userstyles"
  );
  lines[3] = lines[3].replace(
    "catppuccin/userstyles",
    "LeonN534/Dark-Minimalist-userstyles"
  );
  lines[5] = lines[5]
    .replace("catppuccin/userstyles", "LeonN534/Dark-Minimalist-userstyles")
    .replace("catppuccin.user.css", "dark-minimalist.user.css");
  lines[6] = lines[6].replace(
    "catppuccin/userstyles",
    "LeonN534/Dark-Minimalist-userstyles"
  );

  // Change description
  lines[7] = lines[7].replace(
    "Soothing pastel theme",
    "Minimalist design using the Dark Minimalist color palette"
  );

  // Change author
  lines[8] = lines[8].replace("Catppuccin", "LeonN534");

  // Only one dark theme
  lines[13] = lines[13].replace(
    '["latte:Latte", "frappe:Frappé", "macchiato:Macchiato", "mocha:Mocha*"]',
    '["dm:Dark Minimalist*"]'
  );

  // Change version
  const words2 = lines[4].split(" ");
  words2[words2.length - 1] = "1.0.0";
  lines[4] = words2.join(" ");

  // Delete the unused flavors
  lines.splice(lines.length - 8, 3);

  // Delete the 13th line (light theme)
  lines.splice(12, 1);

  // Join the lines back into the file content
  let newData = lines.join("\n");

  // Replace all instances of 'catppuccin' with 'darkMinimalist'
  newData = newData.replace(/catppuccin/g, "darkMinimalist");

  // Replace colors and theme

  newData = newData.replace(/@mocha/g, "@dm");

  newData = newData.replace(/@lightFlavor/g, "@darkFlavor");

  //   Rosewater
  newData = newData.replace(/f5e0dc/g, "fdddf5");
  // 	Flamingo
  newData = newData.replace(/f2cdcd/g, "f9aee9");
  // 	Pink
  newData = newData.replace(/f5c2e7/g, "f685e6");
  // 	Mauve
  newData = newData.replace(/cba6f7/g, "d484f4");
  // 	Red
  newData = newData.replace(/f38ba8/g, "f67d7b");
  // 	Maroon
  newData = newData.replace(/eba0ac/g, "f7859f");
  // 	Peach
  newData = newData.replace(/fab387/g, "f7a285");
  // 	Yellow
  newData = newData.replace(/f9e2af/g, "f3eb84");
  // 	Green
  newData = newData.replace(/a6e3a1/g, "96f685");
  // 	Teal
  newData = newData.replace(/94e2d5/g, "85f7cc");
  // 	Sky
  newData = newData.replace(/89dceb/g, "85f7f1");
  // 	Sapphire
  newData = newData.replace(/74c7ec/g, "a7f9e2");
  // 	Blue
  newData = newData.replace(/89b4fa/g, "85bef7");
  // 	Lavender
  newData = newData.replace(/b4befe/g, "abc0f9");
  // 	Text
  newData = newData.replace(/cdd6f4/g, "e5e5e5");
  // 	Subtext1
  newData = newData.replace(/bac2de/g, "d0d1d32");
  // 	Subtext0
  newData = newData.replace(/a6adc8/g, "b9b9c0");
  // 	Overlay2
  newData = newData.replace(/9399b2/g, "9e9da9");
  // 	Overlay1
  newData = newData.replace(/7f849c/g, "868592");
  // 	Overlay0
  newData = newData.replace(/6c7086/g, "757480");
  // 	Surface2
  newData = newData.replace(/585b70/g, "605f6b");
  // 	Surface1
  newData = newData.replace(/45475a/g, "4d4b56");
  // 	Surface0
  newData = newData.replace(/313244/g, "3b3a44");
  // 	Base
  newData = newData.replace(/1e1e2e/g, "2b2a33");
  // 	Mantle
  newData = newData.replace(/181825/g, "211f27");
  // 	Crust
  newData = newData.replace(/11111b/g, "1c1b22");

  // Write the file back
  await fs.writeFile(newFilePath, newData, "utf-8");

  // Delete original file
  await fs.unlink(filePath);
}
