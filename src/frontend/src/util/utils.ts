import axios from "axios";
import clsx, { ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { APITemplateType } from "../types/api";
import { checkUpperWords } from "../utils";
import { checkSassUrl } from "@/components/bs-comp/FileView";
import ReactDOMServer, { renderToStaticMarkup } from 'react-dom/server';
import ReactMarkdown from 'react-markdown';
import DOMPurify from 'dompurify';
import { createElement, ReactElement } from "react";


export function classNames(...classes: Array<string>): string {
    return classes.filter(Boolean).join(" ");
}

/**
 * 统一绑定quill富文本渲染自定义bolt的事件
 * 考虑安全性
*/
export const bindQuillEvent = (ref: any) => {
    if (!ref?.current) return;
    const links = ref.current.querySelectorAll("div.ql-bsfile");
    links.forEach(link => {
        const url = link.getAttribute('data-url');
        const name = link.getAttribute('data-name');
        link.addEventListener("click", (e) => {
            e.preventDefault();
            downloadFile(checkSassUrl(url), name)
        });
    });
    const images = ref.current.querySelectorAll("img");
    images.forEach(image => {
        const url = image.getAttribute('src');
        image.setAttribute('src', checkSassUrl(url));
    });
}

export const uploadFile = async ({ url, fileName = 'file', file, callback, cancel = null }) : Promise<any> => {
    try {
        const CancelToken = axios.CancelToken;    
        const formData = new FormData();
        formData.append(fileName, file);
        const config = {
            headers: { 'Content-Type': 'multipart/form-data;charset=utf-8' },
            onUploadProgress: (progressEvent) => {
                const { loaded, total } = progressEvent;
                const progress = Math.round((loaded * 100) / total);
                console.log(`Upload progress: ${file.name} ${progress}%`);
                callback?.(progress)
                // You can update your UI with the progress information here
            },
            cancelToken: new CancelToken(function executor(c) {
                if (cancel) cancel = c;
            })
        };

        // Convert the FormData to binary using the FileReader API
        const data = await axios.post(url, formData, config);

        data && callback?.(100);

        console.log('Upload complete:', data);
        return data.data
        // Handle the response data as needed
    } catch (error) {
        console.error('Error uploading file:', error);
        return ''
        // Handle errors
    }
}

export function downloadFile(url, label) {
    console.log('download file :>> ', url);

    return axios.get(url, { responseType: "blob" }).then((res: any) => {
        const blob = new Blob([res.data]);
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = label;
        link.click();
        URL.revokeObjectURL(link.href);
    }).catch(console.error);
}

export function downloadJson(content) {
    const jsonStr = JSON.stringify(content)
    const jsonString = `data:text/json;chatset=utf-8,${encodeURIComponent(jsonStr)}`;

    const link = document.createElement("a");
    link.href = jsonString;
    link.download = `sample.json`;

    link.click();
}

export function cn(...inputs: ClassValue[]): string {
    return twMerge(clsx(inputs));
}

// 交集
export function intersectArrays(...arrays) {
    if (arrays.length === 0) {
        return [];
    }

    // 使用第一个数组作为基准
    const baseArray = arrays[0];

    // 过滤出基准数组中的元素，这些元素在其他所有数组中都存在
    const intersection = baseArray.filter((element) => {
        return arrays.every((array) => array.includes(element));
    });

    return intersection;
}

// 时间戳转换 天时分秒（dhms）
export function formatMilliseconds(ms: number, format: string): string {
    const secondsInMillisecond = 1;
    const minutesInMillisecond = secondsInMillisecond * 60;
    const hoursInMillisecond = minutesInMillisecond * 60;
    const daysInMillisecond = hoursInMillisecond * 24;

    const days = Math.floor(ms / daysInMillisecond);
    const remainingHours = ms % daysInMillisecond;
    const hours = Math.floor(remainingHours / hoursInMillisecond);
    const remainingMinutes = remainingHours % hoursInMillisecond;
    const minutes = Math.floor(remainingMinutes / minutesInMillisecond);
    const remainingSeconds = remainingMinutes % minutesInMillisecond;
    const seconds = Math.floor(remainingSeconds / secondsInMillisecond);

    let formattedString = format.replace('dd', days.toString());
    formattedString = formattedString.replace('hh', hours.toString());
    formattedString = formattedString.replace('mm', minutes.toString());
    formattedString = formattedString.replace('ss', seconds.toString());

    // Remove any extra spaces
    // formattedString = formattedString.replace(/\s+/g, ' ').trim();

    return formattedString;
}

// Date转换为目标格式
export function formatDate(date: Date, format: string): string {
    const addZero = (num) => num < 10 ? `0${num}` : `${num}`
    const replacements = {
        'yyyy': date.getFullYear(),
        'MM': addZero(date.getMonth() + 1),
        'dd': addZero(date.getDate()),
        'HH': addZero(date.getHours()),
        'mm': addZero(date.getMinutes()),
        'ss': addZero(date.getSeconds())
    }
    return format.replace(/yyyy|MM|dd|HH|mm|ss/g, (match) => replacements[match])
}

// param time: yyyy-mm-ddTxxxx
export function formatStrTime(time: string, notSameDayFormat: string): string {
    if (!time) return ''
    const date1 = new Date(time)
    const date2 = new Date()
    return date1.getFullYear() === date2.getFullYear() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getDate() === date2.getDate() ? formatDate(date1, 'HH:mm') : formatDate(date1, notSameDayFormat)
}

export function toTitleCase(str: string | undefined): string {
    if (!str) return "";
    let result = str
        .split("_")
        .map((word, index) => {
            if (index === 0) {
                return checkUpperWords(
                    word[0].toUpperCase() + word.slice(1).toLowerCase()
                );
            }
            return checkUpperWords(word.toLowerCase());
        })
        .join(" ");

    return result
        .split("-")
        .map((word, index) => {
            if (index === 0) {
                return checkUpperWords(
                    word[0].toUpperCase() + word.slice(1).toLowerCase()
                );
            }
            return checkUpperWords(word.toLowerCase());
        })
        .join(" ");
}

export function getFieldTitle(
    template: APITemplateType,
    templateField: string
): string {
    return template[templateField].display_name
        ? template[templateField].display_name!
        : template[templateField].name
            ? toTitleCase(template[templateField].name!)
            : toTitleCase(templateField);
}

// 取后缀名
export function getFileExtension(filename) {
    const basename = filename.split(/[\\/]/).pop(); // 去除路径
    const match = basename.match(/\.([^.]+)$/);
    return match ? match[1] : '';
  }


// 校验合法json
export function isValidJSON(str) {
    if (typeof str !== 'string') return false;

    // 简单的前置检查
    str = str.trim();
    if (!(str.startsWith('{') && str.endsWith('}')) &&
        !(str.startsWith('[') && str.endsWith(']'))) {
        return false;
    }

    // 完整解析验证
    try {
        JSON.parse(str);
        return true;
    } catch (e) {
        return false;
    }
}

export async function webmToWav(webmBlob) {
    const audioCtx = new AudioContext();
    const buffer = await audioCtx.decodeAudioData(await webmBlob.arrayBuffer());
    const wavBlob = bufferToWav(buffer); // 实现 WAV 编码
    return wavBlob;
  }

function bufferToWav(buffer, options = {}) {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = options.float32 ? 3 : 1; // 1: PCM, 3: Float32
  const bitDepth = options.float32 ? 32 : 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;

  // 计算数据大小
  const dataSize = buffer.length * blockAlign;
  const bufferSize = 44 + dataSize;
  const arrayBuffer = new ArrayBuffer(bufferSize);
  const view = new DataView(arrayBuffer);

  // 写入 WAV 头部信息
  writeString(view, 0, 'RIFF');
  view.setUint32(4, bufferSize - 8, true); // RIFF 块大小
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // fmt 子块大小
  view.setUint16(20, format, true); // 音频格式（1: PCM）
  view.setUint16(22, numChannels, true); // 声道数
  view.setUint32(24, sampleRate, true); // 采样率
  view.setUint32(28, sampleRate * blockAlign, true); // 字节率
  view.setUint16(32, blockAlign, true); // 块对齐
  view.setUint16(34, bitDepth, true); // 位深度
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true); // 数据块大小

  // 写入 PCM 数据
  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = buffer.getChannelData(ch)[i];
      if (format === 1) { // PCM
        view.setInt16(offset, sample * (0x7fff), true);
      } else { // Float32
        view.setFloat32(offset, sample, true);
      }
      offset += bytesPerSample;
    }
  }

  return new Blob([view], { type: 'audio/wav' });
}

// 辅助函数：写入字符串到 DataView
function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function sanitizeHtmlToText(html) {
  // 使用DOMPurify进行安全清理
  const cleanHtml = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'strong', 'em', 'u', 's', 'br', 'img', 'div', 'a'], // 允许的标签
    ALLOWED_ATTR: ['src', 'data-url', 'data-name', 'class'] // 允许的属性
  });

  // 创建临时div来解析HTML
  const temp = document.createElement('div');
  temp.innerHTML = cleanHtml;

  // 处理特殊元素
  // 图片替换为[图片]
  const images = temp.querySelectorAll('img');
  images.forEach(img => {
    img.replaceWith('[图片]');
  });

  // 文件处理
  const files = temp.querySelectorAll('.ql-file');
  files.forEach(file => {
    const fileName = file.getAttribute('data-name') || '文件';
    file.replaceWith(`[文件:${fileName}]`);
  });

  // 获取纯文本
  return temp.textContent || temp.innerText || '';
}
function markdownToText(markdown: string): string {
  // 使用createElement替代JSX语法
  const reactElement: ReactElement = createElement(
    ReactMarkdown,
    { children: markdown }
  );
  
  // 将React元素渲染为HTML字符串
  const htmlString = renderToStaticMarkup(reactElement);
  
  // 使用HTML处理方法转换为纯文本
  return sanitizeHtmlToText(htmlString);
}

/**
 * 智能内容转换函数
 * @param {string} content 富文本或Markdown内容
 * @returns {string} 纯文本
 */
export function contentToPlainText(content) {
  if (!content) return '';
  
  // 简单判断是否是HTML（包含HTML标签）
  const isHtml = /<[a-z][\s\S]*>/i.test(content);
  
  // 简单判断是否是Markdown（包含Markdown特有语法）
  const isMarkdown = !isHtml && /^[\s\S]*([*_`\[]|#+\s)/.test(content);
  
  if (isHtml) {
    return sanitizeHtmlToText(content);
  }
  
  if (isMarkdown) {
    return markdownToText(content);
  }
  
  // 纯文本直接返回
  return content;
}

export function optimizeForTTS(text) {
  if (!text) return '';
  
  return text
    // 合并连续空白字符
    .replace(/\s+/g, ' ')
    // 处理特殊符号
    .replace(/\.{3,}/g, '省略号')
    .replace(/…/g, '省略号')
    .replace(/#/g, '井号')
    .replace(/\*/g, '星号')
    // 去除首尾空白
    .trim();
}

export function formatTTSText(text) {
    return optimizeForTTS(contentToPlainText(text));
}