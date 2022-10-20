const express = require('express');
const bodyParser = require('body-parser');
const uploader = require('express-fileupload');
const CryptoJS = require('crypto-js');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffmpeg = require('fluent-ffmpeg');

const { resolve } = require('path');
const {
  readFileSync,
  writeFileSync,
  appendFileSync,
  existsSync,
  unlinkSync,
  rmdirSync,
  readdirSync,
  mkdirSync
} = require('fs');
const { ok } = require('assert');
const e = require('express');

const app = express();
const PORT = 8000;

// middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json()); 
app.use(uploader());
// 靜態文件跨域
app.use('/', express.static('videos', {
  setHeaders(res) {
    res.set('Access-Control-Allow-Origin', '*');
  }
}));

ffmpeg.setFfmpegPath(ffmpegPath);

const ALLOWED_TYPES = {
  'video/mp4': 'mp4',
  'video/ogg': 'ogg',
  'hls': 'm3u8'
};

// 請求跨域
app.all('*', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'POST,GET');
  next();
});

const tempDir = resolve(__dirname, './temp/'),
      videoDir = resolve(__dirname, './videos/');

// 上傳影片
app.post('/upload_video', (req, res) => {
  // chunk -> folder -> temp
  const {
    name,
    type,
    size,
    chunkName
  } = req.body;

  const { chunk } = req.files,
        fileName = CryptoJS.MD5(name),
        tempFilesDir = tempDir + '/' + fileName;

  // 切片存在
  if(!chunk){
    res.send({
      code: 1001,
      msg: 'No file uploaded'
    });
    return;
  }

  // 格式檢查
  if(!ALLOWED_TYPES[type]){
    res.send({
      msg: 1002,
      msg: 'Type is not allowed'
    });
    return;
  }

  // 確認資料夾存在
  if(!existsSync(tempFilesDir)){
    mkdirSync(tempFilesDir);
  }

  // 寫入檔案
  writeFileSync(tempFilesDir + '/' + chunkName, chunk.data);

  res.send({
    code: 0,
    msg: 'Chunks are all uploaded',
    filename: fileName.toString()
  });
});

// 合併影片
app.post('/merge_video', (req, res) => {
  // chunk -> mp4
  const { filename, type } = req.body,
        tempFilesDir = tempDir + '/' + filename,
        videoFileDir = videoDir + '/' + filename,
        fileList = readdirSync(tempFilesDir);

  if(!existsSync(videoFileDir)){
    mkdirSync(videoFileDir);
  }

  const mp4Path = `${ videoFileDir }/${ filename }.${ ALLOWED_TYPES[type] }`,
        hlsPath = `${ videoFileDir }/${ filename }.${ ALLOWED_TYPES['hls'] }`;

  fileList.forEach(chunk => {
    const chunkPath = `${ tempFilesDir }/${ chunk }`,
          chunkContent = readFileSync(chunkPath);
    
    if(!existsSync(mp4Path)){
      writeFileSync(mp4Path, chunkContent);
    } else {
      appendFileSync(mp4Path, chunkContent);
    }

    unlinkSync(chunkPath);
  });

  rmdirSync(tempFilesDir);

  formatVideo(mp4Path, {
    videoCodec: 'libx264',
    format: 'hls',
    outputOptions: '-hls_list_size 0',
    outputOption: '-hls_time 5',
    output: hlsPath,
    onError(){
      const fileList = readdirSync(videoFileDir);
            
      fileList.forEach(chunk => {
        const chunkPath = `${ videoFileDir }/${ chunk }`;
        unlinkSync(chunkPath);
      });

      rmdirSync(videoFileDir);
      
      res.send({
        code: 1006,
        msg: e.message
      });
    },
    onEnd(){
      res.send({
        code: 0,
        msg: 'Upload Successfully',
        videoSrc: `http://localhost:8000/${ filename }/${ filename }.${ ALLOWED_TYPES['hls'] }`
      })
    }
  })
});

// 影片格式化
function formatVideo(path, {
  videoCodec,
  format,
  outputOptions,
  outputOption,
  output,
  onError,
  onEnd
}){
  ffmpeg(path)
    .videoCodec(videoCodec)
    .format(format)
    .outputOptions(outputOptions)
    .outputOption(outputOption)
    .output(output)
    .on('error', onError)
    .on('end', onEnd)
    .run();
}

// 監聽端口
app.listen(PORT, () => {
  console.log('Server is running on ' + PORT);
});