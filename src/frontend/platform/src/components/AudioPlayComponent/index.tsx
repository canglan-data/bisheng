// components/AudioPlayButton.tsx
import { useState } from 'react';
import { useAudioPlayerStore } from '@/store/useAudioPlayerStore';
import { Mic, Square, Loader } from 'lucide-react';
import { textToSpeech } from '@/controllers/API/flow';
import { checkSassUrl } from '../bs-comp/FileView';
import { ThunmbIcon } from '../bs-icons';
import { formatTTSText } from '@/util/utils';
import { message } from '../bs-ui/toast/use-toast';

interface AudioPlayButtonProps {
  messageId: string;
  getAudioUrl: () => Promise<string>; // 获取音频的异步函数
}

export const AudioPlayComponent = ({ messageId, msg }: AudioPlayButtonProps) => {
  const [error, setError] = useState('');
  const {
    currentPlayingId,
    soundInstance,
    isLoading,
    playAudio,
    pauseAudio,
    resumeAudio,
    stopAudio,
    setLoading,
    setCurrentPlayingId,
  } = useAudioPlayerStore();

  const getAudioUrl = async (msg: string) => {
    const res = await textToSpeech({ text: formatTTSText(msg) });
    return checkSassUrl(res.url);
  }

  console.log(currentPlayingId, messageId, soundInstance?.playing());
  
  const isPlaying = currentPlayingId === messageId && soundInstance?.playing();
  const isThisLoading = currentPlayingId === messageId && isLoading;
  console.log('isPlaying', isPlaying);
  console.log('soundInstance', soundInstance);

  const handlePlay = async () => {
    try {
      setError('');
      
      // 如果点击的是当前正在播放的音频
      if (currentPlayingId === messageId) {
        if (soundInstance?.playing()) {
          // 如果正在播放，则暂停
          pauseAudio();
        } else {
          // 如果已暂停，则继续播放
          resumeAudio();
        }
        return;
      }

      // 如果是新的音频，停止当前播放的音频
      if (currentPlayingId) {
        stopAudio();
      }
      // 设置当前音频为加载状态
      setLoading(true);
      setCurrentPlayingId(messageId);
      // 获取新的音频
      const audioUrl = await getAudioUrl(msg);
      playAudio({
        id: messageId,
        audioUrl: checkSassUrl(audioUrl),
        onEnd: () => {
          // 播放结束后的回调
        },
      });
    } catch (err) {
      message({
          variant: 'warning',
          description: '文本较长，后台转录中，请稍后再试'
      })
      setLoading(false);
      setCurrentPlayingId(null);
      console.error(err);
    }
  };

  return (
    <div className="audio-play-button-container">
      <button
        onClick={handlePlay}
        disabled={isThisLoading}
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isThisLoading ? (
          <ThunmbIcon
            type='loading'
            className={`${'animate-spin'}`}
          />
        ) : (
          <ThunmbIcon
            type='sound'
            className={`${'cursor-pointer'} ${isPlaying && 'text-primary hover:text-primary'}`}
          />
        )}
      </button>
      {error && <div className="error-message">{error}</div>}
    </div>
  );
};