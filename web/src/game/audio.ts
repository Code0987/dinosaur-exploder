import { asset } from "./assets";
import type { Settings } from "./save";
import type { Sfx } from "./sim";

const FILES: Record<Sfx, string> = {
  shoot: "shoot.mp3",
  explode: "enemyExplode.mp3",
  playerHit: "playerHit.mp3",
  coin: "coinHit.mp3",
  heart: "heartHit.mp3",
};

class AudioBus {
  private music: HTMLAudioElement | null = null;
  private musicName = "";
  private settings: Settings = {
    volume: 1,
    muted: false,
    sfxVolume: 1,
    sfxMuted: false,
    language: "English",
  };

  apply(settings: Settings) {
    this.settings = settings;
    if (this.music) {
      this.music.volume = settings.volume;
      this.music.muted = settings.muted;
    }
  }

  unlock() {
    if (this.music && this.music.paused && !this.settings.muted) {
      void this.music.play().catch(() => undefined);
    }
  }

  playMusic(name: "menu" | "game") {
    const file = name === "menu" ? "mainMenu.mp3" : "gameBackground.mp3";
    if (this.musicName === file && this.music) {
      this.unlock();
      return;
    }
    this.music?.pause();
    const music = new Audio(asset(`assets/sounds/${file}`));
    music.loop = true;
    music.volume = this.settings.volume;
    music.muted = this.settings.muted;
    this.music = music;
    this.musicName = file;
    void music.play().catch(() => undefined);
  }

  stopMusic() {
    this.music?.pause();
    this.music = null;
    this.musicName = "";
  }

  play(name: Sfx) {
    if (this.settings.sfxMuted) return;
    const sound = new Audio(asset(`assets/sounds/${FILES[name]}`));
    sound.volume = this.settings.sfxVolume;
    void sound.play().catch(() => undefined);
  }
}

export const audio = new AudioBus();
