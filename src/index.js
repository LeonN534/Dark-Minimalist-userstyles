import fs from 'fs';
import path, { dirname } from 'path';
import 'dotenv/config'
import { fileURLToPath } from 'url';
import { downloadStylesFiles } from './style-cloner.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const stylesDirectory = path.join(__dirname, '..', 'styles');

// Clean folder where the styles will be placed

fs.readdir(stylesDirectory, (err, files) => {
  if (err) throw err;

  for (const file of files) {
    fs.unlink(path.join(stylesDirectory, file), err => {
      if (err) throw err;
    });
  }
});

// Get the styles from the Catppuccin usertyles repo as a zip file

downloadStylesFiles(
  "https://github.com/catppuccin/userstyles/tree/main/styles"
);

