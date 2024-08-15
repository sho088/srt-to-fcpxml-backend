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

app.post('/convert', upload.single('srtFile'), async (req, res) => {
    console.log('Request received');
    const { fps } = req.body;
    console.log('FPS:', fps);
    const srtFilePath = req.file ? req.file.path : null;
    console.log('SRT file path:', srtFilePath);

    if (!srtFilePath) {
        console.error('No file uploaded');
        res.status(400).send('No file uploaded');
        return;
    }
  
    try {
        console.log('Starting FCPXML generation');
        const xmlContent = generateFcpxml(srtFilePath, parseFloat(fps));
        const projectName = path.parse(req.file.originalname).name;
        const outputDir = path.join(__dirname, 'outputs');

        // 出力ディレクトリが存在しない場合は作成する
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir);
        }

        const outputFilePath = path.join(outputDir, `${projectName}.fcpxml`);
        console.log('Output file path:', outputFilePath);
  
        fs.writeFileSync(outputFilePath, xmlContent);
        console.log('File written successfully');
        res.download(outputFilePath, `${projectName}.fcpxml`, (err) => {
            if (err) {
                console.error('Download error:', err);
                res.status(500).send('File download error');
                return;
            }
            console.log('File downloaded successfully');
            fs.unlinkSync(srtFilePath);  // アップロードされたSRTファイルを削除
            fs.unlinkSync(outputFilePath);  // 生成されたFCPXMLファイルを削除
            console.log('Temporary files deleted');
        });
    } catch (error) {
        console.error('Conversion error:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
