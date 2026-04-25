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

  playNote(frequency, noteName) {
    const ctx = this.audioContext;
    const now = ctx.currentTime;
    
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, now);
    
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2000, now);
    
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.8, now + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
    
    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.start(now);
    oscillator.stop(now + 1.5);
    
    return { oscillator, gainNode };
  }

  parseChineseNotation(input) {
    const lines = input.trim().split('\n');
    const parsedNotes = [];
    
    lines.forEach((line, lineIndex) => {
      const tokens = this.tokenizeLine(line);
      
      tokens.forEach(token => {
        if (!token) return;
        
        const parsed = this.parseToken(token);
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

  tokenizeLine(line) {
    const tokens = [];
    let remaining = line.trim();
    
    while (remaining.length > 0) {
      let matched = false;
      
      const regex = /^([1-7A-Ga-g])(_([+-]?\d+))?/;
      const match = remaining.match(regex);
      
      if (match) {
        tokens.push(match[0]);
        remaining = remaining.substring(match[0].length).trim();
        matched = true;
      }
      
      if (!matched) {
        remaining = remaining.substring(1);
      }
    }
    
    return tokens;
  }

  parseToken(token) {
    const regex = /^([1-7A-Ga-g])(_([+-]?\d+))?/;
    const match = token.match(regex);
    
    if (!match) return null;
    
    const noteChar = match[1].toUpperCase();
    
    if (!this.noteMap[noteChar]) return null;
    
    let octave = 4;
    if (match[3]) {
      octave = 4 + parseInt(match[3]);
    }
    
    return {
      note: this.noteMap[noteChar],
      octave: octave
    };
  }

  parseFallback(input) {
    const lines = input.trim().split('\n');
    const parsedNotes = [];
    
    lines.forEach((line, lineIndex) => {
      const tokens = line.trim().split(/\s+/);
      
      tokens.forEach(token => {
        if (!token) return;
        
        let octave = 4;
        let noteName = token;
        
        const dotCountAbove = (token.match(/·*$/) || [''])[0].length;
        const dotCountBelow = (token.match(/^·*/) || [''])[0].length;
        
        if (dotCountAbove > 0) {
          octave = 4 + dotCountAbove;
          noteName = token.replace(/·*$/, '');
        } else if (dotCountBelow > 0) {
          octave = 4 - dotCountBelow;
          noteName = token.replace(/^·*/, '');
        }
        
        if (noteName.length === 1 && '1234567'.includes(noteName)) {
          noteName = this.noteMap[noteName];
        }
        
        if (this.noteMap[noteName.toUpperCase()]) {
          parsedNotes.push({
            note: noteName.toUpperCase(),
            octave: octave,
            frequency: this.getPianoFrequency(noteName.toUpperCase(), octave),
            line: lineIndex + 1
          });
        }
      });
    });
    
    return parsedNotes;
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
        
        this.playNote(note.frequency, note.note);
        
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