const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { generateFcpxml } = require('./utils/fcpxml');

const app = express();
const port = process.env.PORT || 5001;

app.use(cors());

const upload = multer({ dest: 'uploads/' });

app.post('/convert', upload.single('srtFile'), (req, res) => {
    console.log('Request received');  // デバッグログ
    const { fps } = req.body;
    console.log('FPS:', fps);  // デバッグログ
    const srtFilePath = req.file ? req.file.path : null;
    console.log('SRT file path:', srtFilePath);  // デバッグログ

    if (!srtFilePath) {
        console.error('No file uploaded');  // エラーログ
        res.status(400).send('No file uploaded');
        return;
    }
  
    try {
        console.log('Starting FCPXML generation');  // デバッグログ
        const xmlContent = generateFcpxml(srtFilePath, parseFloat(fps));
        const projectName = path.parse(req.file.originalname).name;
        const outputFilePath = path.join(__dirname, 'outputs', `${projectName}.fcpxml`);
        console.log('Output file path:', outputFilePath);  // デバッグログ
  
        fs.writeFileSync(outputFilePath, xmlContent);
        console.log('File written successfully');  // デバッグログ
        res.download(outputFilePath, `${projectName}.fcpxml`, (err) => {
            if (err) {
                console.error('Download error:', err);
                res.status(500).send('File download error');
                return;
            }
            console.log('File downloaded successfully');  // デバッグログ
            fs.unlinkSync(srtFilePath);  // アップロードされたSRTファイルを削除
            fs.unlinkSync(outputFilePath);  // 生成されたFCPXMLファイルを削除
            console.log('Temporary files deleted');  // デバッグログ
        });
    } catch (error) {
        console.error('Conversion error:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
