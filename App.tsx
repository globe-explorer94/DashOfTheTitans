import React, { useState, useEffect, useRef } from 'react';
import { Play, ShoppingCart, ChevronLeft, Trophy, Lock, RotateCcw, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Constants & Types ---

enum GameState {
  HOME,
  LEVEL_SELECT,
  SHOP,
  PLAYING,
  VICTORY
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

interface LevelData {
  id: number;
  name: string;
  difficulty: string;
  color: string;
  length: number; // in pixels
  obstacles: Obstacle[];
  portals: Portal[];
  orbs: Orb[];
  coins: Coin[];
  speed: number;
}

interface Obstacle {
  x: number;
  y: number;
  type: 'spike' | 'block' | 'jumppad';
  w: number;
  h: number;
}

interface Portal {
  x: number;
  y: number;
  type: 'gravity' | 'ship' | 'cube' | 'speed_up' | 'speed_normal';
}

interface Orb {
  x: number;
  y: number;
  type: 'yellow' | 'blue';
  collected?: boolean;
}

interface Coin {
  x: number;
  y: number;
  collected: boolean;
}

const COLORS = [
  { id: 'neon-blue', value: '#00f2ff', price: 0 },
  { id: 'neon-green', value: '#00ff88', price: 20 },
  { id: 'neon-pink', value: '#ff00ff', price: 50 },
  { id: 'neon-orange', value: '#ff8800', price: 100 },
  { id: 'neon-red', value: '#ff0044', price: 200 },
];

// --- Level Generator ---

const generateLevel = (id: number): LevelData => {
  let seed = id * 1234.567;
  const rnd = () => {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  };

  const length = 15000 + id * 10000;
  const color = id === 1 ? '#22d3ee' : id === 2 ? '#a855f7' : '#f43f5e';
  const obstacles: Obstacle[] = [];
  const portals: Portal[] = [];
  const orbs: Orb[] = [];
  const coins: Coin[] = [];

  // Difficulty scaling
  const shipProb = 0.3 + id * 0.1;
  const speed = 6 + id * 0.5;

  let currentX = 1200;
  let isShip = false;

  while (currentX < length - 2000) {
    const rand = rnd();
    
    if (!isShip) {
      if (rand < 0.2) {
        // Spike pit
        const count = Math.floor(rnd() * (2 + id)) + 1; 
        if (count >= 3) {
          obstacles.push({ x: currentX - 80, y: 0, type: 'jumppad', w: 40, h: 10 });
        }
        for (let i = 0; i < count; i++) {
          obstacles.push({ x: currentX + i * 40, y: 0, type: 'spike', w: 40, h: 40 });
        }
        currentX += 600;
      } else if (rand < 0.4) {
        // Platform with spikes under it
        const platWidth = 160 + id * 40;
        const platHeight = 15;
        const platY = 60;
        for (let i = 0; i < platWidth; i += 40) {
          obstacles.push({ x: currentX + i, y: platY, type: 'block', w: 40, h: platHeight });
        }
        for (let i = 0; i < platWidth; i += 80) {
          obstacles.push({ x: currentX + i, y: 0, type: 'spike', w: 40, h: 40 });
        }
        currentX += platWidth + 400;
      } else if (rand < 0.6) {
        // Staircase
        const steps = 2 + id;
        for (let i = 0; i < steps; i++) {
          obstacles.push({ x: currentX + i * 40, y: 0, type: 'block', w: 40, h: (i + 1) * 20 });
        }
        obstacles.push({ x: currentX + 160, y: 0, type: 'spike', w: 40, h: 40 });
        if (rnd() > (0.6 - id * 0.1)) {
          obstacles.push({ x: currentX + 40, y: 360, type: 'spike', w: 40, h: 40 });
        }
        currentX += 600;
      } else if (rand < 0.75) {
        // Orb jump sequence
        orbs.push({ x: currentX + 100, y: 140, type: 'yellow' });
        obstacles.push({ x: currentX, y: 0, type: 'spike', w: 40, h: 40 });
        obstacles.push({ x: currentX + 40, y: 0, type: 'spike', w: 40, h: 40 });
        obstacles.push({ x: currentX + 250, y: 0, type: 'block', w: 40, h: 40 });
        currentX += 600;
      } else if (rand < 0.9) {
        // Portal transition
        const pType = rnd() > (1 - shipProb) ? 'ship' : 'gravity';
        portals.push({ x: currentX, y: 100, type: pType });
        if (pType === 'ship') isShip = true;
        if (pType === 'gravity') {
          for (let i = 0; i < 3; i++) {
            obstacles.push({ x: currentX + 800 + i * 120, y: 360, type: 'spike', w: 40, h: 40 });
          }
          currentX += 1600;
        } else {
          currentX += 1000;
        }
      } else {
        // Simple blocks
        obstacles.push({ x: currentX, y: 0, type: 'block', w: 120, h: 40 });
        if (rnd() > (0.5 - id * 0.1)) {
          obstacles.push({ x: currentX + 40, y: 360, type: 'spike', w: 40, h: 40 });
        }
        currentX += 400;
      }
    } else {
      // Ship section
      const shipRand = rnd();
      if (shipRand < 0.3) {
        const gap = 180 - id * 10;
        const topY = 200 + rnd() * 150;
        obstacles.push({ x: currentX, y: topY, type: 'block', w: 40, h: 400 });
        obstacles.push({ x: currentX, y: topY - gap - 400, type: 'block', w: 40, h: 400 });
        currentX += 450;
      } else if (shipRand < 0.6) {
        const tunnelY = 100 + rnd() * 150;
        const tunnelGap = 140 - id * 10;
        for (let i = 0; i < 480; i += 40) {
          obstacles.push({ x: currentX + i, y: tunnelY + tunnelGap, type: 'block', w: 40, h: 400 });
          obstacles.push({ x: currentX + i, y: -200, type: 'block', w: 40, h: tunnelY + 200 });
        }
        currentX += 650;
      } else if (shipRand < 0.8) {
        portals.push({ x: currentX, y: 150, type: rnd() > 0.5 ? 'speed_up' : 'speed_normal' });
        currentX += 800;
      } else {
        portals.push({ x: currentX, y: 150, type: 'cube' });
        isShip = false;
        currentX += 1000;
      }
    }

    if (rnd() > 0.97) {
      coins.push({ x: currentX - 200, y: isShip ? 200 : 160, collected: false });
    }
  }

  return {
    id,
    name: `Level ${id}`,
    difficulty: id === 1 ? 'Easy' : id === 2 ? 'Normal' : 'Hard',
    color,
    length,
    obstacles,
    portals,
    orbs,
    coins,
    speed
  };
};

// --- Main Component ---

export default function App() {
  const [gameState, setGameState] = useState<GameState>(GameState.HOME);
  const [coins, setCoins] = useState(50);
  const [unlockedLevels, setUnlockedLevels] = useState([1]);
  const [selectedLevel, setSelectedLevel] = useState<LevelData | null>(null);
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [ownedColors, setOwnedColors] = useState(['neon-blue']);
  const [attempts, setAttempts] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPracticeMode, setIsPracticeMode] = useState(false);
  const [highscores, setHighscores] = useState<{ [key: number]: number }>({});
  const [practiceHighscores, setPracticeHighscores] = useState<{ [key: number]: number }>({});
  const [showInfo, setShowInfo] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(null);

  // Game Logic State
  const player = useRef({
    x: 100,
    y: 0,
    vy: 0,
    rotation: 0,
    isGrounded: true,
    isShip: false,
    gravity: 0.8,
    jumpForce: 13,
    size: 40,
    isDead: false,
    progress: 0,
    speed: 6,
    gravityDir: -1, // -1 is down, 1 is up
  });

  const camera = useRef({ x: 0, y: 0 });
  const particles = useRef<Particle[]>([]);
  const keys = useRef<{ [key: string]: boolean }>({});
  const updateRef = useRef<() => void>(() => {});
  const checkpoints = useRef<any[]>([]);
  const lastCheckpointTime = useRef<number>(0);

  const handleStartLevel = (levelId: number) => {
    const level = generateLevel(levelId);
    setSelectedLevel(level);
    resetPlayer();
    checkpoints.current = [];
    lastCheckpointTime.current = Date.now();
    setAttempts(1);
    setGameState(GameState.PLAYING);
  };

  const resetPlayer = () => {
    player.current = {
      x: 100,
      y: 0,
      vy: 0,
      rotation: 0,
      isGrounded: true,
      isShip: false,
      gravity: 0.8,
      jumpForce: 13,
      size: 40,
      isDead: false,
      progress: 0,
      speed: selectedLevel?.speed || 6,
      gravityDir: -1,
    };
    camera.current.x = 0;
    camera.current.y = 0;
    particles.current = [];
    setProgress(0);
  };

  const spawnParticles = (x: number, y: number, color: string, count: number) => {
    for (let i = 0; i < count; i++) {
      particles.current.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10,
        life: 1.0,
        color,
        size: Math.random() * 4 + 2
      });
    }
  };

  const addCheckpoint = () => {
    checkpoints.current.push({
      player: { ...player.current },
      camera: { ...camera.current }
    });
    lastCheckpointTime.current = Date.now();
    spawnParticles(player.current.x, player.current.y, '#ff0000', 15);
  };

  const removeCheckpoint = () => {
    if (checkpoints.current.length > 0) {
      checkpoints.current.pop();
      spawnParticles(player.current.x, player.current.y, '#ff0000', 10);
    }
  };

  const update = () => {
    if (gameState !== GameState.PLAYING || !selectedLevel) return;

    const p = player.current;
    const level = selectedLevel;

    if (p.isDead) {
      p.vy = 0;
      return;
    }

    // Practice mode auto-checkpoint
    if (isPracticeMode && Date.now() - lastCheckpointTime.current > 5000) {
      addCheckpoint();
    }

    const isJumping = keys.current[' '] || keys.current['ArrowUp'] || keys.current['mousedown'];

    if (p.isShip) {
      if (isJumping) p.vy -= 0.6 * p.gravityDir;
      p.vy += 0.3 * p.gravityDir;
      p.vy *= 0.95;
      p.rotation = p.vy * 0.1;
    } else {
      if (isJumping && p.isGrounded) {
        p.vy = p.jumpForce * -p.gravityDir;
        p.isGrounded = false;
        spawnParticles(p.x, p.y + (p.gravityDir < 0 ? 0 : p.size), selectedColor.value, 5);
      }
      p.vy += p.gravity * p.gravityDir;
      if (!p.isGrounded) {
        p.rotation += 0.15;
      } else {
        p.rotation = Math.round(p.rotation / (Math.PI / 2)) * (Math.PI / 2);
      }
    }

    p.x += p.speed;
    p.y += p.vy;

    const groundY = 0;
    const ceilingY = 400;

    if (p.gravityDir < 0) {
      if (p.y < groundY) {
        p.y = groundY;
        p.vy = 0;
        p.isGrounded = true;
      }
    } else {
      if (p.y > ceilingY - p.size) {
        p.y = ceilingY - p.size;
        p.vy = 0;
        p.isGrounded = true;
      }
    }

    if (p.isShip && (p.y < -50 || p.y > 450)) die();

    level.obstacles.forEach(obs => {
      if (checkCollision(p.x, p.y, p.size, p.size, obs.x, obs.y, obs.w, obs.h)) {
        if (obs.type === 'spike') {
          die();
        } else if (obs.type === 'block') {
          // Check if landing on top (or bottom if gravity reversed)
          const landingSurface = p.gravityDir < 0 ? obs.y + obs.h : obs.y - p.size;
          const isMovingTowardsSurface = p.vy * p.gravityDir > 0;
          const wasAboveSurface = p.gravityDir < 0 ? (p.y - p.vy >= obs.y + obs.h - 5) : (p.y - p.vy <= obs.y - p.size + 5);

          if (isMovingTowardsSurface && wasAboveSurface) {
             p.y = landingSurface;
             p.vy = 0;
             p.isGrounded = true;
          } else {
            die();
          }
        } else if (obs.type === 'jumppad') {
          if (p.isGrounded) {
            p.vy = p.jumpForce * 1.5 * -p.gravityDir;
            p.isGrounded = false;
            spawnParticles(obs.x, obs.y, '#ffff00', 10);
          }
        }
      }
    });

    level.portals.forEach(portal => {
      if (Math.abs(p.x - portal.x) < 50) {
        if (portal.type === 'gravity') {
          p.gravityDir *= -1;
          portal.x = -1000;
        } else if (portal.type === 'ship') {
          p.isShip = true;
        } else if (portal.type === 'cube') {
          p.isShip = false;
        } else if (portal.type === 'speed_up') {
          p.speed = level.speed * 1.5;
        } else if (portal.type === 'speed_normal') {
          p.speed = level.speed;
        }
      }
    });

    level.orbs.forEach(orb => {
      const dx = (p.x + p.size / 2) - orb.x;
      const dy = (p.y + p.size / 2) - orb.y;
      if (!orb.collected && Math.sqrt(dx * dx + dy * dy) < 60) {
        if (isJumping) {
          if (orb.type === 'yellow') p.vy = p.jumpForce * -p.gravityDir;
          if (orb.type === 'blue') p.gravityDir *= -1;
          orb.collected = true;
          spawnParticles(orb.x, orb.y, '#ffff00', 10);
        }
      }
    });

    level.coins.forEach(coin => {
      const dx = (p.x + p.size / 2) - coin.x;
      const dy = (p.y + p.size / 2) - coin.y;
      if (!coin.collected && Math.sqrt(dx * dx + dy * dy) < 40) {
        coin.collected = true;
        setCoins(prev => prev + 10);
        spawnParticles(coin.x, coin.y, '#ffd700', 15);
      }
    });

    camera.current.x = p.x - 200;
    const targetCamY = p.y > 150 ? p.y - 150 : 0;
    camera.current.y += (targetCamY - camera.current.y) * 0.1;
    
    p.progress = Math.min(100, (p.x / level.length) * 100);
    setProgress(p.progress);

    if (p.x > level.length) victory();

    particles.current.forEach(part => {
      part.x += part.vx;
      part.y += part.vy;
      part.life -= 0.02;
    });
    particles.current = particles.current.filter(p => p.life > 0);
  };

  const checkCollision = (x1: number, y1: number, w1: number, h1: number, x2: number, y2: number, w2: number, h2: number) => {
    return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
  };

  const die = () => {
    const p = player.current;
    if (p.isDead) return;
    p.isDead = true;
    spawnParticles(p.x + p.size/2, p.y + p.size/2, selectedColor.value, 30);

    // Update highscores
    if (selectedLevel) {
      const currentProgress = Math.floor(p.progress);
      if (isPracticeMode) {
        setPracticeHighscores(prev => ({
          ...prev,
          [selectedLevel.id]: Math.max(prev[selectedLevel.id] || 0, currentProgress)
        }));
      } else {
        setHighscores(prev => ({
          ...prev,
          [selectedLevel.id]: Math.max(prev[selectedLevel.id] || 0, currentProgress)
        }));
      }
    }

    setTimeout(() => {
      if (isPracticeMode && checkpoints.current.length > 0) {
        const lastCp = checkpoints.current[checkpoints.current.length - 1];
        player.current = { ...lastCp.player, isDead: false };
        camera.current = { ...lastCp.camera };
        particles.current = [];
      } else {
        resetPlayer();
        checkpoints.current = [];
      }
      setAttempts(prev => prev + 1);
    }, 800);
  };

  const victory = () => {
    setGameState(GameState.VICTORY);
    if (selectedLevel) {
      if (isPracticeMode) {
        setPracticeHighscores(prev => ({ ...prev, [selectedLevel.id]: 100 }));
      } else {
        setHighscores(prev => ({ ...prev, [selectedLevel.id]: 100 }));
        if (!unlockedLevels.includes(selectedLevel.id + 1)) {
          setUnlockedLevels(prev => [...prev, selectedLevel.id + 1]);
        }
      }
    }
  };

  const draw = (ctx: CanvasRenderingContext2D) => {
    const level = selectedLevel;
    if (!level) return;

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    const camX = camera.current.x;
    const camY = camera.current.y;
    const h = ctx.canvas.height;
    const groundLevel = h - 150;

    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#05050a');
    grad.addColorStop(1, '#101020');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    ctx.save();
    ctx.translate(-camX, groundLevel + camY);
    ctx.scale(1, -1);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    for (let x = Math.floor(camX / 100) * 100; x < camX + ctx.canvas.width + 100; x += 100) {
      ctx.beginPath(); ctx.moveTo(x, -200); ctx.lineTo(x, 600); ctx.stroke();
    }

    ctx.fillStyle = '#0a0a14';
    ctx.fillRect(camX, -200, ctx.canvas.width, 200);
    ctx.fillRect(camX, 400, ctx.canvas.width, 200);

    ctx.strokeStyle = level.color;
    ctx.lineWidth = 4;
    ctx.shadowBlur = 20;
    ctx.shadowColor = level.color;
    // Ground
    ctx.beginPath(); ctx.moveTo(camX, 0); ctx.lineTo(camX + ctx.canvas.width, 0); ctx.stroke();
    // Ceiling
    ctx.beginPath(); ctx.moveTo(camX, 400); ctx.lineTo(camX + ctx.canvas.width, 400); ctx.stroke();
    ctx.shadowBlur = 0;

    level.obstacles.forEach(obs => {
      if (obs.x + obs.w < camX || obs.x > camX + ctx.canvas.width) return;
      ctx.fillStyle = '#151525';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      if (obs.type === 'spike') {
        if (obs.y > 200) {
          // Ceiling spike: base at y + h (ceiling), tip at y
          ctx.beginPath();
          ctx.moveTo(obs.x, obs.y + obs.h);
          ctx.lineTo(obs.x + obs.w / 2, obs.y);
          ctx.lineTo(obs.x + obs.w, obs.y + obs.h);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else {
          // Ground spike: base at y (ground), tip at y + h
          ctx.beginPath();
          ctx.moveTo(obs.x, obs.y);
          ctx.lineTo(obs.x + obs.w / 2, obs.y + obs.h);
          ctx.lineTo(obs.x + obs.w, obs.y);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
      } else if (obs.type === 'jumppad') {
        ctx.save();
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ffff00';
        ctx.fillStyle = '#ffff00';
        ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);
        ctx.restore();
      } else {
        ctx.fillRect(obs.x, obs.y, obs.w, obs.h); ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);
      }
    });

    level.portals.forEach(p => {
      ctx.save();
      let color = '#00ffff';
      if (p.type === 'ship') color = '#ff00ff';
      if (p.type === 'speed_up') color = '#ffff00';
      if (p.type === 'speed_normal') color = '#00ff00';
      
      ctx.shadowBlur = 25;
      ctx.shadowColor = color;
      ctx.fillStyle = `${color}66`;
      ctx.fillRect(p.x, p.y - 50, 40, 150);
      ctx.restore();
    });

    level.orbs.forEach(orb => {
      if (orb.collected) return;
      ctx.save();
      ctx.shadowBlur = 15;
      ctx.shadowColor = orb.type === 'yellow' ? '#ffff00' : '#0000ff';
      ctx.fillStyle = orb.type === 'yellow' ? '#ffff00' : '#0000ff';
      ctx.beginPath(); ctx.arc(orb.x, orb.y, 15, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    });

    level.coins.forEach(coin => {
      if (coin.collected) return;
      ctx.save();
      ctx.shadowBlur = 10; ctx.shadowColor = '#ffd700'; ctx.fillStyle = '#ffd700';
      ctx.beginPath(); ctx.arc(coin.x, coin.y, 12, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    });

    if (isPracticeMode) {
      checkpoints.current.forEach((cp) => {
        ctx.save();
        const x = cp.player.x + cp.player.size / 2;
        const y = cp.player.y + cp.player.size / 2;
        
        ctx.translate(x, y);
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#ff3333';
        ctx.fillStyle = '#ff0000';
        
        // Crystal shape
        ctx.beginPath();
        ctx.moveTo(0, -25);
        ctx.lineTo(15, 0);
        ctx.lineTo(0, 25);
        ctx.lineTo(-15, 0);
        ctx.closePath();
        ctx.fill();
        
        // Crystal highlight
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        ctx.moveTo(0, -15);
        ctx.lineTo(8, 0);
        ctx.lineTo(0, 15);
        ctx.lineTo(-8, 0);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
      });
    }

    particles.current.forEach(p => {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    });
    ctx.globalAlpha = 1.0;

    const p = player.current;
    if (!p.isDead) {
      ctx.save();
      ctx.translate(p.x + p.size / 2, p.y + p.size / 2);
      ctx.rotate(p.rotation);
      ctx.shadowBlur = 25;
      ctx.shadowColor = selectedColor.value;
      ctx.fillStyle = '#111';
      ctx.strokeStyle = selectedColor.value;
      ctx.lineWidth = 3;
      if (p.isShip) {
        ctx.beginPath(); ctx.moveTo(-20, -10); ctx.lineTo(20, 0); ctx.lineTo(-20, 10); ctx.closePath(); ctx.fill(); ctx.stroke();
      } else {
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size); ctx.strokeRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.strokeRect(-p.size / 4, -p.size / 4, p.size / 2, p.size / 2);
      }
      ctx.restore();
    }
    ctx.restore();

    if (isPracticeMode) {
      ctx.save();
      ctx.fillStyle = '#22c55e';
      ctx.font = 'bold 24px Inter';
      ctx.textAlign = 'center';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#22c55e';
      ctx.fillText(`PRACTICE MODE (${checkpoints.current.length})`, ctx.canvas.width / 2, 50);
      ctx.font = 'bold 12px Inter';
      ctx.globalAlpha = 0.5;
      ctx.fillText('Z: SET CHECKPOINT • X: REMOVE LAST', ctx.canvas.width / 2, 75);
      ctx.restore();
    }
  };

  useEffect(() => {
    updateRef.current = update;
  });

  useEffect(() => {
    const loop = () => {
      updateRef.current();
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) draw(ctx);
      }
      requestRef.current = requestAnimationFrame(loop);
    };
    requestRef.current = requestAnimationFrame(loop);
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [gameState, selectedLevel, selectedColor]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { 
      if (keys.current[e.key]) return;
      keys.current[e.key] = true; 
      if (gameState === GameState.PLAYING && isPracticeMode) {
        if (e.key.toLowerCase() === 'z') addCheckpoint();
        if (e.key.toLowerCase() === 'x') removeCheckpoint();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => { keys.current[e.key] = false; };
    const handleMouseDown = () => { keys.current['mousedown'] = true; };
    const handleMouseUp = () => { keys.current['mousedown'] = false; };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [gameState, isPracticeMode]);

  return (
    <div className="fixed inset-0 bg-[#05050a] text-white font-sans overflow-hidden select-none">
      {/* Info Button */}
      <button 
        onClick={() => setShowInfo(true)}
        className="absolute top-6 right-6 z-[100] w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-2xl hover:bg-white/10 hover:scale-110 transition-all"
      >
        ❓
      </button>

      {/* Info Modal */}
      <AnimatePresence>
        {showInfo && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-xl p-8"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="max-w-2xl w-full bg-white/5 border border-white/10 rounded-[40px] p-12 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500" />
              <button 
                onClick={() => setShowInfo(false)}
                className="absolute top-8 right-8 p-2 rounded-full hover:bg-white/10 transition-colors"
              >
                <X size={24} />
              </button>
              
              <div className="flex flex-col items-center text-center gap-8">
                <div className="w-24 h-24 rounded-3xl bg-cyan-500/20 flex items-center justify-center text-5xl shadow-[0_0_40px_rgba(34,211,238,0.3)]">
                  🚀
                </div>
                <h3 className="text-4xl font-black italic tracking-tighter leading-tight">
                  Dash Of The Titans⚡: Conquer the levels as you escape from certain doom in this fast paced browser game. A SupernovaX production.
                </h3>
                <div className="w-16 h-1 bg-white/10 rounded-full" />
                <p className="text-white/40 font-medium tracking-wide uppercase text-sm">
                  Built with passion for the neon grid
                </p>
                <button 
                  onClick={() => setShowInfo(false)}
                  className="mt-4 px-12 py-4 rounded-2xl bg-white text-black font-black hover:bg-cyan-400 transition-colors"
                >
                  GOT IT
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {gameState === GameState.PLAYING && (
        <div className="absolute inset-0 pointer-events-none z-10 p-8">
          <div className="flex justify-between items-start">
            <div className="text-3xl font-black italic tracking-tighter">ATTEMPT {attempts}</div>
            <div className="text-yellow-400 font-bold flex items-center gap-2 text-2xl"><Trophy size={24} /> {coins}</div>
          </div>
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-3/4 h-5 bg-white/10 rounded-full overflow-hidden border border-white/20 backdrop-blur-sm">
            <motion.div 
              className="h-full bg-gradient-to-r from-cyan-400 to-blue-600 shadow-[0_0_20px_rgba(34,211,238,0.6)]" 
              animate={{ width: `${progress}%` }}
              transition={{ type: 'spring', bounce: 0, duration: 0.1 }}
            />
            <div className="absolute inset-0 flex items-center justify-center text-xs font-black tracking-widest">{Math.floor(progress)}%</div>
          </div>
          <button onClick={() => setGameState(GameState.HOME)} className="absolute top-8 left-1/2 -translate-x-1/2 pointer-events-auto opacity-40 hover:opacity-100 transition-opacity"><RotateCcw size={28} /></button>
        </div>
      )}

      <AnimatePresence mode="wait">
        {gameState === GameState.HOME && (
          <motion.div key="home" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="absolute inset-0 flex flex-col items-center justify-center gap-16">
            <h1 className="text-9xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-white/20 drop-shadow-[0_0_40px_rgba(255,255,255,0.4)]">DASH OF THE TITANS ⚡</h1>
            <div className="flex items-center gap-10">
              <button onClick={() => setGameState(GameState.SHOP)} className="w-24 h-24 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all hover:scale-105"><ShoppingCart size={32} /></button>
              <button onClick={() => setGameState(GameState.LEVEL_SELECT)} className="w-40 h-40 rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shadow-[0_0_60px_rgba(34,211,238,0.5)] hover:scale-110 transition-all group"><Play size={64} fill="white" className="ml-3 group-hover:scale-110 transition-transform" /></button>
              <div className="w-24 h-24 rounded-3xl bg-white/5 border border-white/10 flex flex-col items-center justify-center"><Trophy size={28} className="text-yellow-400 mb-1" /><span className="text-lg font-black">{coins}</span></div>
            </div>
          </motion.div>
        )}

        {gameState === GameState.LEVEL_SELECT && (
          <motion.div key="levels" initial={{ opacity: 0, x: 100 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -100 }} className="absolute inset-0 flex flex-col p-16 overflow-y-auto">
            <button onClick={() => setGameState(GameState.HOME)} className="flex items-center gap-2 opacity-50 hover:opacity-100 mb-12 text-xl font-bold"><ChevronLeft /> BACK</button>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
              <h2 className="text-5xl font-black italic tracking-tight">SELECT LEVEL</h2>
              <div className="flex items-center gap-6">
                <button 
                  onClick={() => setIsPracticeMode(!isPracticeMode)}
                  className={`px-8 py-4 rounded-3xl font-black transition-all border-2 flex items-center gap-3 ${isPracticeMode ? 'bg-green-500 border-green-400 text-black shadow-[0_0_30px_rgba(34,197,94,0.4)]' : 'bg-white/5 border-white/10 opacity-50 hover:opacity-100'}`}
                >
                  <div className={`w-3 h-3 rounded-full ${isPracticeMode ? 'bg-black animate-pulse' : 'bg-white/20'}`} />
                  PRACTICE MODE: {isPracticeMode ? 'ON' : 'OFF'}
                </button>
                <div className="hidden lg:block text-[10px] opacity-30 font-black uppercase tracking-[0.2em] max-w-[200px]">
                  Checkpoints every 5s<br/>'Z' to set • 'X' to remove
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[1, 2, 3].map(id => {
                const isLocked = !unlockedLevels.includes(id);
                return (
                  <div key={id} className="flex flex-col gap-4">
                    <button disabled={isLocked} onClick={() => handleStartLevel(id)} className={`relative h-72 rounded-[40px] border p-10 flex flex-col justify-end transition-all overflow-hidden group ${isLocked ? 'bg-white/5 border-white/5 opacity-50 cursor-not-allowed' : 'bg-white/5 border-white/10 hover:border-cyan-400 hover:bg-white/10 hover:scale-105'}`}>
                      <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity"><Play size={160} fill="white" /></div>
                      <div className="relative z-10">
                        <div className="text-sm font-black opacity-40 uppercase tracking-[0.2em] mb-2">{id === 1 ? 'Easy' : id === 2 ? 'Normal' : 'Hard'}</div>
                        <div className="text-4xl font-black italic">LEVEL {id}</div>
                      </div>
                      {isLocked && <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-md"><Lock size={48} /></div>}
                    </button>
                    <div className="px-6 flex flex-col gap-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black opacity-30 uppercase tracking-widest">Real Mode</span>
                        <span className="text-sm font-black text-cyan-400">{highscores[id] || 0}%</span>
                      </div>
                      <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${highscores[id] || 0}%` }} className="h-full bg-cyan-400" />
                      </div>
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-[10px] font-black opacity-30 uppercase tracking-widest">Practice Mode</span>
                        <span className="text-sm font-black text-green-400">{practiceHighscores[id] || 0}%</span>
                      </div>
                      <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${practiceHighscores[id] || 0}%` }} className="h-full bg-green-400" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {gameState === GameState.SHOP && (
          <motion.div key="shop" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="absolute inset-0 flex flex-col p-16">
            <div className="flex justify-between items-center mb-16">
              <button onClick={() => setGameState(GameState.HOME)} className="flex items-center gap-2 opacity-50 hover:opacity-100 text-xl font-bold"><ChevronLeft /> BACK</button>
              <div className="flex items-center gap-3 text-3xl font-black text-yellow-400"><Trophy size={32} /> {coins}</div>
            </div>
            <h2 className="text-5xl font-black mb-16 italic tracking-tight">CUBE SHOP</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-10">
              {COLORS.map(color => {
                const isOwned = ownedColors.includes(color.id);
                const isSelected = selectedColor.id === color.id;
                return (
                  <button key={color.id} onClick={() => { if (coins >= color.price && !isOwned) { setCoins(c => c - color.price); setOwnedColors(o => [...o, color.id]); setSelectedColor(color); } else if (isOwned) setSelectedColor(color); }} className={`aspect-square rounded-[40px] border-4 p-6 flex flex-col items-center justify-center gap-6 transition-all ${isSelected ? 'border-white bg-white/20 scale-105' : isOwned ? 'border-white/20 bg-white/5 hover:bg-white/10' : 'border-white/5 bg-white/2 hover:border-white/20'}`}>
                    <div className="w-20 h-20 rounded-xl shadow-2xl" style={{ backgroundColor: '#111', border: `5px solid ${color.value}`, boxShadow: `0 0 30px ${color.value}66` }} />
                    <div className="text-sm font-black tracking-widest">{isSelected ? 'SELECTED' : isOwned ? 'OWNED' : `${color.price} COINS`}</div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}

        {gameState === GameState.VICTORY && (
          <motion.div key="victory" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 backdrop-blur-2xl z-50">
            <motion.div initial={{ scale: 0.8, y: 40 }} animate={{ scale: 1, y: 0 }} className="text-center">
              <h2 className="text-8xl font-black italic mb-6 text-cyan-400 drop-shadow-[0_0_40px_rgba(34,211,238,0.6)]">
                {isPracticeMode ? 'PRACTICE COMPLETE!' : 'LEVEL COMPLETE!'}
              </h2>
              {!isPracticeMode && selectedLevel && unlockedLevels.includes(selectedLevel.id + 1) && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="text-yellow-400 font-black tracking-[0.3em] mb-8 flex items-center justify-center gap-3">
                  <Trophy size={20} /> NEXT LEVEL UNLOCKED!
                </motion.div>
              )}
              {isPracticeMode && (
                <p className="text-green-400 font-black tracking-[0.2em] mb-8 uppercase">Practice run finished - checkpoints used</p>
              )}
              <p className="text-2xl opacity-40 mb-16 tracking-widest font-bold uppercase">You conquered the neon grid</p>
              <div className="flex gap-6 justify-center">
                <button onClick={() => setGameState(GameState.HOME)} className="px-12 py-5 rounded-3xl bg-white/10 hover:bg-white/20 font-black transition-all text-xl">MENU</button>
                {selectedLevel && selectedLevel.id < 3 && (
                  <button onClick={() => handleStartLevel(selectedLevel.id + 1)} className="px-12 py-5 rounded-3xl bg-cyan-500 hover:bg-cyan-400 text-black font-black transition-all text-xl shadow-[0_0_30px_rgba(34,211,238,0.4)]">NEXT LEVEL</button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <canvas ref={canvasRef} width={window.innerWidth} height={window.innerHeight} className={`w-full h-full transition-opacity duration-700 ${gameState === GameState.PLAYING ? 'opacity-100' : 'opacity-20 pointer-events-none'}`} />
    </div>
  );
}
