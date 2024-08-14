const path = require('path');
const fs = require('fs');
const { create } = require('xmlbuilder2');

function srtTimeToFrame(srtTime, fps) {
  try {
    const ms = parseInt(srtTime.slice(-3));
    const timeParts = srtTime.slice(0, -4).split(':').map(Number);
    const totalMs = timeParts[0] * 3600 * 1000 + timeParts[1] * 60 * 1000 + timeParts[2] * 1000 + ms;
    const frame = Math.floor(totalMs / (1000 / fps));
    console.log(`Converted time ${srtTime} to frame ${frame} at ${fps} FPS`);
    return frame;
  } catch (error) {
    console.error('Error converting SRT time to frame:', error);
    throw error;
  }
}

function generateFcpxml(srtPath, fps) {
  try {
    console.log('SRT file path:', srtPath);
    console.log('FPS:', fps);

    const data = fs.readFileSync(srtPath, { encoding: 'utf8' });
    console.log('SRT file content:', data);

    const subtitles = data.trim().split(/\r?\n\r?\n/);
    console.log('Parsed subtitles:', subtitles);

    const projectName = path.parse(srtPath).name;
    const hundredfoldFps = String(fps * 100);
    
    const lastSubtitle = subtitles[subtitles.length - 1];
    const totalSrtTime = lastSubtitle.split("\n")[1].split(" --> ")[1].replace(/\r/g, '');
    const totalFrame = srtTimeToFrame(totalSrtTime, fps);
    const hundredfoldTotalFrame = String(100 * totalFrame);

    const root = create({ encoding: 'UTF-8' });

    const fcpxml = root.ele('fcpxml').att('version', '1.9');
    const resources = fcpxml.ele('resources');
    
    resources.ele('format', {
      id: 'r1',
      name: `FFVideoFormat1080p${hundredfoldFps}`,
      frameDuration: `100/${hundredfoldFps}`,
      width: '1920',
      height: '1080',
      colorSpace: '1-1-1 (Rec. 709)'
    });

    resources.ele('effect', {
      id: 'r2',
      name: 'Basic Title',
      uid: '.../Titles.localized/Bumper:Opener.localized/Basic Title.localized/Basic Title.moti'
    });

    const library = fcpxml.ele('library');
    const event = library.ele('event').att('name', 'srt2subtitles-cli');
    const project = event.ele('project').att('name', projectName);

    const sequence = project.ele('sequence', {
      format: 'r1',
      tcStart: '0s',
      tcFormat: 'NDF',
      audioLayout: 'stereo',
      audioRate: '48k',
      duration: `${totalFrame}/${hundredfoldFps}s`
    });

    const spline = sequence.ele('spine');
    const gap = spline.ele('gap', {
      name: 'Gap',
      offset: '0s',
      duration: `${hundredfoldTotalFrame}/${hundredfoldFps}s`
    });

    subtitles.forEach((subtitle, i) => {
      const [id, timeRange, ...contentLines] = subtitle.trim().split('\n');
      const [offset, end] = timeRange.split(' --> ').map(time => time.replace(/\r/g, ''));
      const offsetFrame = srtTimeToFrame(offset, fps);
      const endFrame = srtTimeToFrame(end, fps);
      const durationFrame = endFrame - offsetFrame;
      const subtitleContent = contentLines.join('\n');

      console.log(`Processing subtitle ${id}: ${subtitleContent}`);

      const title = gap.ele('title', {
        ref: 'r2',
        lane: '1',
        offset: `${100 * offsetFrame}/${hundredfoldFps}s`,
        duration: `${100 * durationFrame}/${hundredfoldFps}s`,
        name: `${subtitleContent} - Basic Title`
      });

      title.ele('param', {
        name: 'Position',
        key: '9999/999166631/999166633/1/100/101',
        value: '0 -500'
      });

      title.ele('param', {
        name: 'Flatten',
        key: '999/999166631/999166633/2/351',
        value: '1'
      });

      title.ele('param', {
        name: 'Alignment',
        key: '9999/999166631/999166633/2/354/999169573/401',
        value: '1 (Center)'
      });

      const text = title.ele('text');
      text.ele('text-style', { ref: `ts${i}` }).txt(subtitleContent);

      const textStyleDef = title.ele('text-style-def', { id: `ts${i}` });
      textStyleDef.ele('text-style', {
        font: '凸版文久見出しゴシック',
        fontSize: '105',
        lineSpacing: '-30',
        fontColor: '1 1 1 1',
        bold: '1',
        alignment: 'center'
      });
    });

    const xml = root.end({ prettyPrint: true });
    console.log('Generated FCPXML content:', xml); // 生成されたFCPXMLの内容をログ出力
    
    return xml;
  } catch (error) {
    console.error('Error in generateFcpxml:', error); // エラーログを出力
    throw error;
  }
}

module.exports = { generateFcpxml };