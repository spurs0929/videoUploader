import axios from 'axios';
import qs from 'qs';
import 'xgplayer';
import HlsPlayer from 'xgplayer-hls';

import {
  API,
  ALLOWED_TYPES,
  UPLOAD_INFO,
  CHUNK_SIZE
} from './config';

;((doc) => {

  const uploadProgress = doc.querySelector('#uploadProgress'),
        videoUploader = doc.querySelector('#videoUploader'),
        uploadInfo = doc.querySelector('#uploadInfo'),
        startBtn = doc.querySelector('#startBtn'),
        pauseBtn = doc.querySelector('#pauseBtn');

  let paused = true,
      uploadedSize = 0,
      uploadResult = null,
      uploadedFileName = '';

  // 初始化
  const init = () => {
    bindEvent();
  } 

  // 綁定事件處理函數
  const bindEvent = () => {
    startBtn.addEventListener('click', uploadVideo, false);
    pauseBtn.addEventListener('click', switchUploader.bind(null, true), false);
  }

  // 上傳影片
  async function uploadVideo(){
    switchUploader(false);

    const { files: [ file ] } = videoUploader;
  
    // 未選擇檔案
    if(!file){
      uploadInfo.innerText = UPLOAD_INFO['NO_FILE'];
      return;
    }

    // 檔案格式錯誤
    if(!ALLOWED_TYPES[file.type]){
      uploadInfo.innerText = UPLOAD_INFO['INVALID_TYPE'];
      return;
    }

    const { name, size, type } = file;

    // 設定進度百分比最大值
    uploadProgress.max = size;
    // 
    uploadedSize = Number(localStorage.getItem(name) || 0);
    // 上傳中
    uploadInfo.innerText = UPLOAD_INFO['UPLOADING'];

    // 影片切片上傳
    while(uploadedSize < size && !paused){
      const chunk = file.slice(uploadedSize, uploadedSize + CHUNK_SIZE),
            chunkName = new Date().getTime() + '_' + name.replace(`${ ALLOWED_TYPES[type] }`, ''),
            formData = createFormData({
              name,
              type,
              size,
              chunk,
              chunkName
            });
      
      try {
        uploadResult = await axios.post(API.UPLOAD_VIDEO, formData);
        console.log(uploadResult);
      } catch (e) {
        uploadInfo.innerText = `${ UPLOAD_INFO['FAILED'] }(${ e.message })`;
        return;
      }

      uploadedSize += chunk.size;
      uploadProgress.value = uploadedSize;
      localStorage.setItem(name, uploadedSize);
    }

    mergeVideo(name, type);
  }

  // 合併影片
  async function mergeVideo(name, type){
    if(!paused){
      videoUploader.value = null;
      uploadedFileName = uploadResult.data.filename;
      uploadInfo.innerText = UPLOAD_INFO['TRANSCODING'];
    
      const res = await axios.post(API.MERGE_VIDEO, qs.stringify({
        filename: uploadedFileName,
        type
      }));

      localStorage.removeItem(name);
      
      if(res.data.code === 1006){
        uploadInfo.innerText = `${ UPLOAD_INFO['FAILED'] }(${ res.data.msg })`;
        return;
      }

      uploadInfo.innerText = UPLOAD_INFO['SUCCESS'];
      switchUploader(true);
      
      new HlsPlayer({
        id: 'videoContainer',
        url: res.data.videoSrc
      });
    }
  }

  function createFormData({
    name,
    type,
    size,
    chunk,
    chunkName
  }) {
    const formData = new FormData();

    formData.append('name', name);
    formData.append('type', type);
    formData.append('size', size);
    formData.append('chunk', chunk);
    formData.append('chunkName', chunkName);
  
    return formData;
  }

  // 上傳/暫停上傳 
  function switchUploader(bool){
    paused = bool;
    startBtn.style.display = paused ? 'block' : 'none';
    pauseBtn.style.display = paused ? 'none' : 'block';
  }


  init();

})(document);