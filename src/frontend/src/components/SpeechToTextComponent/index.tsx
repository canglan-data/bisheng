import React, { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { Mic, Square } from 'lucide-react';
import { speechToText, textToSpeech, uploadChatFile } from '@/controllers/API/flow';

const SpeechToTextComponent = ({ onChange }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // 开始录音
  const startRecording = async () => {
    try {
      setError(null);
      audioChunksRef.current = [];
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };
      
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        await convertSpeechToText(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      setError('无法访问麦克风: ' + err.message);
      console.error('录音错误:', err);
    }
  };

  // 停止录音
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      setIsProcessing(true);
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // 调用语音转文字API
  const convertSpeechToText = async (audioBlob) => {
    try {
      // 这里替换为你实际的语音转文字API调用
      console.log('调用语音转文字API...', audioBlob);
      const data = await uploadChatFile(audioBlob, (progress) => {})
      
      console.log("data", data);
      const res = await speechToText({
        url: "",
      });
      
      // 模拟API调用延迟
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // 模拟返回的识别结果
      const mockTranscript = '这是一个语音转文字的模拟结果。实际项目中请替换为真实API调用。';
      onChange(mockTranscript);
    } catch (err) {
      setError('语音识别失败: ' + err.message);
      console.error('语音识别错误:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="speech-to-text">
      <button
        onClick={isRecording ? stopRecording : startRecording}
        disabled={isProcessing}
        className={`icon-button ${isRecording ? 'recording' : ''} ${isProcessing ? 'processing' : ''}`}
        aria-label={isRecording ? '停止录音' : '开始录音'}
      >
        {isProcessing ? (
          <div className="spinner"></div>
        ) : isRecording ? (
          <Square size={24} className="stop-icon" />
        ) : (
          <Mic size={24} className="mic-icon" />
        )}
      </button>
      
      {isRecording && <div className="pulse-ring"></div>}
      {error && <div className="error">{error}</div>}
    </div>
  );
};

SpeechToTextComponent.propTypes = {
  onChange: PropTypes.func.isRequired
};

export default SpeechToTextComponent;