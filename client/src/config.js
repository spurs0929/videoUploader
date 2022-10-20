export const BASE_URL = 'http://localhost:8000/';

export const API = {
  UPLOAD_VIDEO: BASE_URL + 'upload_video',
  MERGE_VIDEO: BASE_URL + 'merge_video'
}

export const ALLOWED_TYPES = {
  'video/mp4': 'mp4',
  'video/ogg': 'ogg'
}

export const UPLOAD_INFO = {
  'NO_FILE': '請先選擇檔案!!!',
  'INVALID_TYPE': '不支援的檔案類型',
  'UPLOADING': '上傳中',
  'FAILED': '上傳失敗',
  'TRANSCODING': '轉碼中',
  'SUCCESS': '上傳成功'
}

export const CHUNK_SIZE = 64 * 1024;