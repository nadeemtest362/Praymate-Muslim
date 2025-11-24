import { Audio, AVPlaybackStatus } from 'expo-av';

const MUSIC_URL = 'https://kfrvxoxdehduqrpcbibl.supabase.co/storage/v1/object/public/assets/onboarding/sound/Calm.mp3';

let sound: Audio.Sound | null = null;
let isLoading = false;

export const onboardingMusicManager = {
  async play() {
    if (sound || isLoading) {
      if (sound) {
        const status = await sound.getStatusAsync();
        if (status.isLoaded && !status.isPlaying) {
          await sound.playAsync();
        }
      }
      return;
    }

    isLoading = true;
    try {
      const { sound: createdSound } = await Audio.Sound.createAsync(
        { uri: MUSIC_URL },
        {
          shouldPlay: true,
          isLooping: true,
          volume: 0.1,
        }
      );

      sound = createdSound;

      sound.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
        if (!status.isLoaded && 'error' in status) {
          console.error('[OnboardingMusicManager] Playback error:', status.error);
        }
      });
    } catch (error) {
      console.warn('[OnboardingMusicManager] Failed to start music:', error);
    } finally {
      isLoading = false;
    }
  },

  async stop() {
    if (!sound) {
      return;
    }

    try {
      await sound.stopAsync();
      await sound.unloadAsync();
    } catch (error) {
      console.warn('[OnboardingMusicManager] Failed to stop music:', error);
    } finally {
      sound = null;
    }
  },
};
