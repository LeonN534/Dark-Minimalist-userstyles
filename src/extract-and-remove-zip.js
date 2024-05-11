import fs from 'fs/promises';
import path, { dirname } from 'path';
import JSZip from 'jszip';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const zipFilePath = path.join(__dirname, '..', 'styles', 'userstyles.zip');
const outputDir = path.join(__dirname, '..', 'styles');

export const extractAndRemove = async () => {
  try {
    const data = await fs.readFile(zipFilePath);
    let zip = new JSZip();
    const contents = await zip.loadAsync(data);
    let filePromises = Object.keys(contents.files).map(async filename => {
      let file = contents.file(filename);
      if (file) {
        const content = await file.async('nodebuffer');
        let dest = path.join(outputDir, filename);
        let dir = path.dirname(dest);
        await fs.mkdir(dir, { recursive: true });
        return fs.writeFile(dest, content);
      }
    });
    await Promise.all(filePromises);
    console.log('Files extracted');

    // Remove the zip file
    await fs.unlink(zipFilePath);
    console.log('Zip file removed');
  } catch (err) {
    console.error('Error extracting files:', err);
  }
};