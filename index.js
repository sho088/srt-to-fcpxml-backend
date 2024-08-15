const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { generateFcpxml } = require('./utils/fcpxml');

const app = express();
const port = process.env.PORT || 5001;  // 環境変数からポートを取得

app.use(cors());

const upload = multer({ dest: 'uploads/' });

app.post('/convert', upload.single('srtFile'), (req, res) => {
    const { fps } = req.body;
    const srtFilePath = req.file.path;
  
    try {
        const xmlContent = generateFcpxml(srtFilePath, parseFloat(fps));
        const projectName = path.parse(req.file.originalname).name;
        const outputFilePath = path.join(__dirname, 'outputs', `${projectName}.fcpxml`);
  
        fs.writeFileSync(outputFilePath, xmlContent);
        res.download(outputFilePath, `${projectName}.fcpxml`, (err) => {
            if (err) {
                console.error('Download error:', err);
            }
            fs.unlinkSync(srtFilePath);  // アップロードされたSRTファイルを削除
            fs.unlinkSync(outputFilePath);  // 生成されたFCPXMLファイルを削除
        });
    } catch (error) {
        console.error('Conversion error:', error);
        res.status(500).send('Error processing file');
    }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
