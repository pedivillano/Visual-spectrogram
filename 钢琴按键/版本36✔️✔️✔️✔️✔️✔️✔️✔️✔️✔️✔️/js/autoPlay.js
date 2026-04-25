class AutoPlay {
  constructor(audioContext) {
    this.audioContext = audioContext;
    this.isPlaying = false;
    this.currentNoteIndex = 0;
    this.playbackInterval = null;
    this.noteQueue = [];
    
    this.noteMap = {
      '1': 'C', '2': 'D', '3': 'E', '4': 'F', '5': 'G', '6': 'A', '7': 'B',
      'C': 'C', 'D': 'D', 'E': 'E', 'F': 'F', 'G': 'G', 'A': 'A', 'B': 'B'
    };
  }

  getPianoFrequency(note, octave) {
    const A4 = 440;
    const notes = {
      'C': -9, 'C#': -8, 'D': -7, 'D#': -6, 'E': -5,
      'F': -4, 'F#': -3, 'G': -2, 'G#': -1, 'A': 0, 'A#': 1, 'B': 2
    };
    
    const semitonesFromA4 = (octave - 4) * 12 + notes[note];
    return A4 * Math.pow(2, semitonesFromA4 / 12);
  }

  playNoteWithADSR(frequency, noteName, duration = 0.5) {
    const ctx = this.audioContext;
    const now = ctx.currentTime;
    
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(frequency, now);
    
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(4000, now);
    filter.frequency.exponentialRampToValueAtTime(1000, now + duration);
    
    let attackTime, decayTime, sustainLevel, releaseTime;
    
    if (duration < 0.1) {
      attackTime = 0.005;
      decayTime = 0.01;
      sustainLevel = 0.2;
      releaseTime = 0.05;
    } else if (duration < 0.3) {
      attackTime = 0.01;
      decayTime = 0.02;
      sustainLevel = 0.4;
      releaseTime = 0.1;
    } else if (duration < 0.5) {
      attackTime = 0.02;
      decayTime = 0.05;
      sustainLevel = 0.6;
      releaseTime = 0.2;
    } else {
      attackTime = 0.05;
      decayTime = 0.1;
      sustainLevel = 0.8;
      releaseTime = 0.5;
    }
    
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.9, now + attackTime);
    gainNode.gain.linearRampToValueAtTime(sustainLevel, now + attackTime + decayTime);
    gainNode.gain.setValueAtTime(sustainLevel, now + duration);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration + releaseTime);
    
    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.start(now);
    oscillator.stop(now + duration + releaseTime);
    
    return { oscillator, gainNode };
  }

  playNote(frequency, noteName, duration = 0.5) {
    return this.playNoteWithADSR(frequency, noteName, duration);
  }

  parseChineseNotation(input) {
    const lines = input.trim().split('\n');
    const parsedNotes = [];
    
    lines.forEach((line, lineIndex) => {
      const tokens = line.trim().split(/\s+/);
      
      tokens.forEach(token => {
        if (!token) return;
        
        const parsed = this.tryParseToken(token);
        if (parsed) {
          parsedNotes.push({
            note: parsed.note,
            octave: parsed.octave,
            frequency: this.getPianoFrequency(parsed.note, parsed.octave),
            line: lineIndex + 1,
            originalToken: token
          });
        }
      });
    });
    
    return parsedNotes;
  }

  tryParseToken(token) {
    const upperToken = token.toUpperCase();
    
    const symbolNumberRegex = /^(\^+|v+)?([1-7])$/;
    const symbolNumberMatch = token.match(symbolNumberRegex);
    if (symbolNumberMatch) {
      const symbol = symbolNumberMatch[1] || '';
      const number = symbolNumberMatch[2];
      
      let octave = 4;
      
      if (symbol.startsWith('^')) {
        octave += symbol.length;
      } else if (symbol.startsWith('v')) {
        octave -= symbol.length;
      }
      
      if (this.noteMap[number] && octave >= 1 && octave <= 8) {
        return { note: this.noteMap[number], octave: octave };
      }
    }
    
    const letterOctaveRegex = /^([A-G]#?)(\d+)$/;
    const letterOctaveMatch = upperToken.match(letterOctaveRegex);
    if (letterOctaveMatch) {
      const note = letterOctaveMatch[1];
      const octave = parseInt(letterOctaveMatch[2]);
      if (this.noteMap[note] && octave >= 1 && octave <= 8) {
        return { note: note, octave: octave };
      }
    }
    
    const simpleNumberRegex = /^[1-7]$/;
    if (simpleNumberRegex.test(token)) {
      return { note: this.noteMap[token], octave: 4 };
    }
    
    const simpleLetterRegex = /^[A-G]#?$/i;
    if (simpleLetterRegex.test(token)) {
      return { note: upperToken, octave: 4 };
    }
    
    return null;
  }

  async play(notes, onNotePlayed = null, speed = 500) {
    if (this.isPlaying) {
      await this.stop();
    }
    
    this.isPlaying = true;
    this.currentNoteIndex = 0;
    this.noteQueue = notes;
    
    return new Promise((resolve) => {
      const playNextNote = () => {
        if (!this.isPlaying || this.currentNoteIndex >= this.noteQueue.length) {
          this.isPlaying = false;
          resolve();
          return;
        }
        
        const note = this.noteQueue[this.currentNoteIndex];
        const duration = speed / 1000 * 0.8;
        
        this.playNoteWithADSR(note.frequency, note.note, duration);
        
        if (onNotePlayed) {
          onNotePlayed(note, this.currentNoteIndex);
        }
        
        this.currentNoteIndex++;
        
        this.playbackInterval = setTimeout(playNextNote, speed);
      };
      
      playNextNote();
    });
  }

  async stop() {
    this.isPlaying = false;
    if (this.playbackInterval) {
      clearTimeout(this.playbackInterval);
      this.playbackInterval = null;
    }
  }

  async saveSong(fileName, content) {
    try {
      const response = await fetch('/api/save-song', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ fileName, content })
      });
      return await response.json();
    } catch (error) {
      console.error('保存失败:', error);
      return { success: false, message: '网络错误，请确保服务器已启动' };
    }
  }

  async loadSong(fileName) {
    try {
      const response = await fetch(`/api/load-song/${fileName}`);
      return await response.json();
    } catch (error) {
      console.error('加载失败:', error);
      return { success: false, message: '网络错误，请确保服务器已启动' };
    }
  }

  async listSongs() {
    try {
      const response = await fetch('/api/list-songs');
      return await response.json();
    } catch (error) {
      console.error('获取列表失败:', error);
      return { success: false, message: '网络错误，请确保服务器已启动' };
    }
  }

  async deleteSong(fileName) {
    try {
      const response = await fetch(`/api/delete-song/${fileName}`, {
        method: 'DELETE'
      });
      return await response.json();
    } catch (error) {
      console.error('删除失败:', error);
      return { success: false, message: '网络错误，请确保服务器已启动' };
    }
  }
}