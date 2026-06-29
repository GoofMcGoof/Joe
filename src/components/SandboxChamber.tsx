/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, RefreshCw, Trash2, ArrowDown, Sparkles, Sliders, Volume2, Maximize2 } from 'lucide-react';
import { Inventory, ElementType, SandboxElement, Mixture } from '../types';
import { RAW_INGREDIENTS } from '../data';
import { audio } from '../utils/audio';

interface SandboxChamberProps {
  inventory: Inventory;
  updateInventory: (updater: (prev: Inventory) => Inventory) => void;
  onShowMessage: (text: string, type: 'success' | 'error' | 'info') => void;
}

export default function SandboxChamber({ inventory, updateInventory, onShowMessage }: SandboxChamberProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Grid Dimensions
  const width = 120;
  const height = 80;
  
  // Game loop controls
  const [isPlaying, setIsPlaying] = useState(true);
  const [selectedBrush, setSelectedBrush] = useState<ElementType>('sand');
  const [selectedMixtureId, setSelectedMixtureId] = useState<string>('');
  const [brushSize, setBrushSize] = useState<number>(3);
  const [gravityMode, setGravityMode] = useState<'down' | 'zero' | 'up' | 'left' | 'right'>('down');
  const [particleCount, setParticleCount] = useState(0);
  const [isInspectMode, setIsInspectMode] = useState(false);

  // Simulation Grid State
  const gridRef = useRef<Array<SandboxElement | null>>(Array(width * height).fill(null));
  const isDrawing = useRef(false);

  // Export Chamber
  const exportChamber = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `sandbox-snap-${Date.now()}.png`;
    a.click();
    onShowMessage("Snapshot captured!", "success");
  };

  // Selected custom mixture details
  const activeMixture = inventory.mixtures.find(m => m.id === selectedMixtureId);

  // Initialize Canvas & Size
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Scale canvas pixels for sharp rendering
    canvas.width = width;
    canvas.height = height;

    ctx.fillStyle = '#0b0f19';
    ctx.fillRect(0, 0, width, height);
  }, []);

  // Frame simulation loop
  useEffect(() => {
    let animationId: number;
    let lastTime = Date.now();

    const loop = () => {
      if (isPlaying) {
        updatePhysics();
      }
      renderCanvas();
      animationId = requestAnimationFrame(loop);
    };

    animationId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationId);
  }, [isPlaying, gravityMode, selectedMixtureId]);

  // Main Falling Sand Physics Rules
  const updatePhysics = () => {
    const grid = gridRef.current;
    const nextGrid = [...grid];
    let count = 0;
    let sizzleTriggered = false;

    // Alternating scanning direction to prevent bias
    const topToBottom = Math.random() > 0.5;
    const leftToRight = Math.random() > 0.5;

    const startY = topToBottom ? 0 : height - 1;
    const endY = topToBottom ? height : -1;
    const stepY = topToBottom ? 1 : -1;

    const startX = leftToRight ? 0 : width - 1;
    const endX = leftToRight ? width : -1;
    const stepX = leftToRight ? 1 : -1;

    for (let y = startY; y !== endY; y += stepY) {
      for (let x = startX; x !== endX; x += stepX) {
        const i = y * width + x;
        const cell = grid[i];

        if (!cell) continue;
        count++;

        // Calculate gravity direction vector
        let gx = 0, gy = 0;
        if (gravityMode === 'down') gy = 1;
        else if (gravityMode === 'up') gy = -1;
        else if (gravityMode === 'left') gx = -1;
        else if (gravityMode === 'right') gx = 1;

        // Custom Mixture properties overriding defaults
        let customProperties = null;
        if (cell.type === 'custom_mixture' && cell.mixtureId) {
          customProperties = inventory.mixtures.find(m => m.id === cell.mixtureId)?.properties;
          if (customProperties?.antiGravity && customProperties.antiGravity > 0.4) {
            // Reverses vertical gravity direction for helium/glowing dusts
            gy = -1;
          }
        }

        // ELEMENT BEHAVIORS:
        
        // 1. Solid / Immovable
        if (cell.type === 'stone') {
          continue; 
        }

        // 2. Wood (static but flammable)
        if (cell.type === 'wood') {
          // Check for nearby fire/lava to ignite
          if (hasNeighbor(grid, x, y, 'fire') || hasNeighbor(grid, x, y, 'lava')) {
            nextGrid[i] = { type: 'fire', color: '#ff4500', life: 25 + Math.random() * 25 };
            sizzleTriggered = true;
          }
          continue;
        }

        // 3. Plant/Vine
        if (cell.type === 'plant') {
          // If touching water, spread plant cells upward/downward
          if (hasNeighbor(grid, x, y, 'water') && Math.random() < 0.05) {
            const rx = x + (Math.random() > 0.5 ? 1 : -1);
            const ry = y + (Math.random() > 0.5 ? 1 : -1);
            if (isEmpty(nextGrid, rx, ry)) {
              nextGrid[ry * width + rx] = { type: 'plant', color: '#2f855a' };
            }
          }
          if (hasNeighbor(grid, x, y, 'fire') || hasNeighbor(grid, x, y, 'lava')) {
            nextGrid[i] = { type: 'fire', color: '#e53e3e', life: 10 + Math.random() * 15 };
          }
          continue;
        }

        // 4. Fire
        if (cell.type === 'fire') {
          // Fire turns to steam when touching water
          if (hasNeighbor(grid, x, y, 'water')) {
            nextGrid[i] = { type: 'smoke', color: '#e2e8f0', life: 15 + Math.random() * 10 };
            sizzleTriggered = true;
            continue;
          }
          // Fire moves UPWARDS and dissipates
          const nextLife = (cell.life || 0) - 1;
          if (nextLife <= 0) {
            nextGrid[i] = Math.random() > 0.5 ? { type: 'smoke', color: '#4a5568', life: 10 + Math.random() * 15 } : null;
          } else {
            cell.life = nextLife;
            // Float up and randomly drift sideways
            const dx = Math.floor(Math.random() * 3) - 1;
            const dy = -1;
            const targetX = x + dx;
            const targetY = y + dy;

            if (isEmpty(nextGrid, targetX, targetY)) {
              nextGrid[i] = null;
              nextGrid[targetY * width + targetX] = cell;
            }
          }
          continue;
        }

        // 5. Smoke (rises and vanishes)
        if (cell.type === 'smoke') {
          const nextLife = (cell.life || 0) - 1;
          if (nextLife <= 0) {
            nextGrid[i] = null;
          } else {
            cell.life = nextLife;
            const dx = Math.floor(Math.random() * 3) - 1;
            const dy = -1;
            if (isEmpty(nextGrid, x + dx, y + dy)) {
              nextGrid[i] = null;
              nextGrid[(y + dy) * width + (x + dx)] = cell;
            }
          }
          continue;
        }

        // 6. Spark / Electricity (fast chain conduction in metal/iron)
        if (cell.type === 'spark') {
          nextGrid[i] = null; // Spark vanishes instantly from current location
          
          // Propagate spark to adjacent metal/iron or custom conductive mixtures
          const neighbors = [
            { nx: x + 1, ny: y },
            { nx: x - 1, ny: y },
            { nx: x, ny: y + 1 },
            { nx: x, ny: y - 1 },
          ];

          neighbors.forEach(({ nx, ny }) => {
            if (isValid(nx, ny)) {
              const nIdx = ny * width + nx;
              const nCell = grid[nIdx];
              if (nCell && (nCell.type === 'powder_iron' || (nCell.type === 'custom_mixture' && inventory.mixtures.find(m => m.id === nCell.mixtureId)?.properties.conductivity && (inventory.mixtures.find(m => m.id === nCell.mixtureId)?.properties.conductivity || 0) > 0.2))) {
                if (Math.random() < 0.45) {
                  nextGrid[nIdx] = { type: 'spark', color: '#4fd1c5' };
                  audio.playSpark();
                }
              }
              // Ignite explosives on contact
              if (nCell && (nCell.type === 'powder_sulfur' || nCell.type === 'powder_charcoal' || nCell.type === 'custom_mixture')) {
                igniteCell(nx, ny, nCell, nextGrid);
              }
            }
          });
          continue;
        }

        // 7. Water (Liquid flows downwards & sideways)
        if (cell.type === 'water') {
          // Water turns to steam when touching fire
          if (hasNeighbor(grid, x, y, 'fire') || hasNeighbor(grid, x, y, 'lava')) {
            nextGrid[i] = { type: 'smoke', color: '#e2e8f0', life: 15 + Math.random() * 10 };
            sizzleTriggered = true;
            continue;
          }
          // Sinks down
          if (isEmpty(nextGrid, x + gx, y + gy)) {
            nextGrid[i] = null;
            nextGrid[(y + gy) * width + (x + gx)] = cell;
          } else {
            // Checks diagonals
            const leftX = x - 1;
            const rightX = x + 1;
            const diagY = y + gy;
            
            const canLeft = isEmpty(nextGrid, leftX, diagY);
            const canRight = isEmpty(nextGrid, rightX, diagY);

            if (canLeft && canRight) {
              const dx = Math.random() > 0.5 ? -1 : 1;
              nextGrid[i] = null;
              nextGrid[diagY * width + (x + dx)] = cell;
            } else if (canLeft) {
              nextGrid[i] = null;
              nextGrid[diagY * width + leftX] = cell;
            } else if (canRight) {
              nextGrid[i] = null;
              nextGrid[diagY * width + rightX] = cell;
            } else {
              // Flow horizontally left or right
              const flowLeft = isEmpty(nextGrid, x - 1, y);
              const flowRight = isEmpty(nextGrid, x + 1, y);
              if (flowLeft && flowRight) {
                const dx = Math.random() > 0.5 ? -1 : 1;
                nextGrid[i] = null;
                nextGrid[y * width + (x + dx)] = cell;
              } else if (flowLeft) {
                nextGrid[i] = null;
                nextGrid[y * width + (x - 1)] = cell;
              } else if (flowRight) {
                nextGrid[i] = null;
                nextGrid[y * width + (x + 1)] = cell;
              }
            }
          }
          continue;
        }

        // 8. Acid (Dissolves stuff)
        if (cell.type === 'acid') {
          // Flow like water, but erode neighbors
          let eroded = false;
          const directions = [
            { dx: 0, dy: 1 },
            { dx: 1, dy: 0 },
            { dx: -1, dy: 0 },
            { dx: 0, dy: -1 }
          ];

          for (const dir of directions) {
            const nx = x + dir.dx;
            const ny = y + dir.dy;
            if (isValid(nx, ny)) {
              const targetIdx = ny * width + nx;
              const targetCell = grid[targetIdx];
              if (targetCell && targetCell.type !== 'stone' && targetCell.type !== 'acid' && targetCell.type !== 'lava') {
                // Dissolve!
                nextGrid[targetIdx] = null;
                eroded = true;
                break;
              }
            }
          }

          if (eroded) {
            nextGrid[i] = { type: 'smoke', color: '#68d391', life: 8 }; // Turn acid to toxic smoke
            sizzleTriggered = true;
            continue;
          }

          // Liquid movement downwards
          if (isEmpty(nextGrid, x, y + 1)) {
            nextGrid[i] = null;
            nextGrid[(y + 1) * width + x] = cell;
          } else {
            const dx = Math.random() > 0.5 ? -1 : 1;
            if (isEmpty(nextGrid, x + dx, y + 1)) {
              nextGrid[i] = null;
              nextGrid[(y + 1) * width + (x + dx)] = cell;
            } else if (isEmpty(nextGrid, x + dx, y)) {
              nextGrid[i] = null;
              nextGrid[y * width + (x + dx)] = cell;
            }
          }
          continue;
        }

        // 9. Lava (slow moving extreme heat)
        if (cell.type === 'lava') {
          // Burns wood/oil/explosives and reacts with water
          let reacted = false;
          const neighbors = [
            { nx: x + 1, ny: y },
            { nx: x - 1, ny: y },
            { nx: x, ny: y + 1 },
            { nx: x, ny: y - 1 },
          ];

          for (const { nx, ny } of neighbors) {
            if (isValid(nx, ny)) {
              const nIdx = ny * width + nx;
              const nCell = grid[nIdx];
              if (nCell && nCell.type === 'water') {
                // Water + Lava = Obsidian Stone + Steam Smoke
                nextGrid[nIdx] = { type: 'stone', color: '#4a5568' };
                nextGrid[i] = { type: 'smoke', color: '#e2e8f0', life: 15 };
                reacted = true;
                audio.playExplosion(0.1);
                break;
              }
            }
          }

          if (reacted) continue;

          // Slow lava gravity downward flow (30% chance of updating position)
          if (Math.random() < 0.25) {
            if (isEmpty(nextGrid, x, y + 1)) {
              nextGrid[i] = null;
              nextGrid[(y + 1) * width + x] = cell;
            } else {
              const dx = Math.random() > 0.5 ? -1 : 1;
              if (isEmpty(nextGrid, x + dx, y + 1)) {
                nextGrid[i] = null;
                nextGrid[(y + 1) * width + (x + dx)] = cell;
              }
            }
          }
          continue;
        }

        // 10. Oil (flammable liquid floats on water)
        if (cell.type === 'oil') {
          // If touching fire or spark, ignite!
          if (hasNeighbor(grid, x, y, 'fire') || hasNeighbor(grid, x, y, 'spark') || hasNeighbor(grid, x, y, 'lava')) {
            nextGrid[i] = { type: 'fire', color: '#ed8936', life: 40 + Math.random() * 20 };
            sizzleTriggered = true;
            continue;
          }

          // Flow and float
          const belowCell = grid[(y + 1) * width + x];
          if (belowCell && belowCell.type === 'water') {
            // Float up! Swap positions
            nextGrid[i] = belowCell;
            nextGrid[(y + 1) * width + x] = cell;
          } else if (isEmpty(nextGrid, x, y + 1)) {
            nextGrid[i] = null;
            nextGrid[(y + 1) * width + x] = cell;
          } else {
            const dx = Math.random() > 0.5 ? -1 : 1;
            if (isEmpty(nextGrid, x + dx, y + 1)) {
              nextGrid[i] = null;
              nextGrid[(y + 1) * width + (x + dx)] = cell;
            } else if (isEmpty(nextGrid, x + dx, y)) {
              nextGrid[i] = null;
              nextGrid[y * width + (x + dx)] = cell;
            }
          }
          continue;
        }

        // 11. Generic Sand-like Solids (sand, coal, sulfur, saltpeter, etc.)
        const isSandLike = 
          cell.type === 'sand' || 
          cell.type === 'powder_charcoal' || 
          cell.type === 'powder_sulfur' || 
          cell.type === 'powder_saltpeter' || 
          cell.type === 'powder_iron' || 
          cell.type === 'powder_rust' || 
          cell.type === 'powder_aluminium' || 
          cell.type === 'powder_phosphor' || 
          cell.type === 'custom_mixture';

        if (isSandLike) {
          // SPECIAL REACTIONS:
          
          // Charcoal combustion
          if (cell.type === 'powder_charcoal' && (hasNeighbor(grid, x, y, 'fire') || hasNeighbor(grid, x, y, 'lava') || hasNeighbor(grid, x, y, 'spark'))) {
            nextGrid[i] = { type: 'fire', color: '#e53e3e', life: 30 };
            sizzleTriggered = true;
            continue;
          }

          // Sulfur rapid flare
          if (cell.type === 'powder_sulfur' && (hasNeighbor(grid, x, y, 'fire') || hasNeighbor(grid, x, y, 'lava') || hasNeighbor(grid, x, y, 'spark'))) {
            nextGrid[i] = { type: 'fire', color: '#ecc94b', life: 15 };
            sizzleTriggered = true;
            // Spawn rapid sparkles
            const sIdx = (y - 1) * width + x;
            if (isEmpty(nextGrid, x, y - 1)) {
              nextGrid[sIdx] = { type: 'fire', color: '#ffeb3b', life: 10 };
            }
            continue;
          }

          // Thermite contact reaction (Rust + Aluminium + Heat)
          if (cell.type === 'powder_rust' && hasNeighbor(grid, x, y, 'powder_aluminium') && (hasNeighbor(grid, x, y, 'fire') || hasNeighbor(grid, x, y, 'spark'))) {
            // Triggers massive white/orange molten flash (Spawns Lava and explosion sounds!)
            triggerThermiteBlast(x, y, nextGrid);
            continue;
          }

          // Custom Mixture dynamic reaction
          if (cell.type === 'custom_mixture' && cell.mixtureId) {
            const mix = inventory.mixtures.find(m => m.id === cell.mixtureId);
            const props = mix?.properties;
            const proportions = mix?.proportions;

            if (props) {
              // Level 10 High-Difficulty Reactions:
              // 1. Plasma Ore moisture reaction (extreme instability when testing)
              const plasmaProportion = proportions?.['plasma_ore'] || 0;
              if (plasmaProportion > 0.15 && hasNeighbor(grid, x, y, 'water')) {
                // Steam explosion! Flash vaporize the water
                triggerExplosion(x, y, 4 + Math.round(plasmaProportion * 10), true, nextGrid);
                sizzleTriggered = true;
                continue;
              }

              // 2. Xenon Salt quantum leveling reaction
              const xenonProportion = proportions?.['xenon_salt'] || 0;
              if (xenonProportion > 0.15 && (hasNeighbor(grid, x, y, 'spark') || hasNeighbor(grid, x, y, 'fire'))) {
                // Shoot upward sparkling sparks
                const upY = y - 1;
                if (isValid(x, upY) && isEmpty(nextGrid, x, upY) && Math.random() < 0.4) {
                  nextGrid[upY * width + x] = { type: 'spark', color: '#b794f4' };
                }
              }

              // Spark/Fire ignition
              if (hasNeighbor(grid, x, y, 'fire') || hasNeighbor(grid, x, y, 'spark') || hasNeighbor(grid, x, y, 'lava')) {
                if (props.explosiveness > 0.3) {
                  // Explode!
                  triggerExplosion(x, y, 6 + Math.round(props.explosiveness * 12), props.flashPotential, nextGrid);
                  continue;
                } else if (props.flammability > 0.2) {
                  nextGrid[i] = { type: 'fire', color: cell.color, life: Math.round(props.flammability * 40) };
                  sizzleTriggered = true;
                  continue;
                } else if (props.reactiveThermite) {
                  triggerThermiteBlast(x, y, nextGrid);
                  continue;
                }
              }

              // Plant Fertilizer growth factor trigger (bloom dust)
              if (props.growthFactor > 0.3 && (hasNeighbor(grid, x, y, 'water') || hasNeighbor(grid, x, y, 'plant'))) {
                // Growth sprouts green plants/vines!
                growVines(x, y, nextGrid);
                continue;
              }
            }
          }

          // SAND GRAVITY & SLIDING
          const dx = gx;
          const dy = gy;

          if (isEmpty(nextGrid, x + dx, y + dy)) {
            nextGrid[i] = null;
            nextGrid[(y + dy) * width + (x + dx)] = cell;
          } else {
            // Check diagonal slide left and right
            const slideLeftX = x - 1;
            const slideRightX = x + 1;
            const slideY = y + dy;

            const canLeft = isEmpty(nextGrid, slideLeftX, slideY);
            const canRight = isEmpty(nextGrid, slideRightX, slideY);

            if (canLeft && canRight) {
              const sideX = Math.random() > 0.5 ? -1 : 1;
              nextGrid[i] = null;
              nextGrid[slideY * width + (x + sideX)] = cell;
            } else if (canLeft) {
              nextGrid[i] = null;
              nextGrid[slideY * width + slideLeftX] = cell;
            } else if (canRight) {
              nextGrid[i] = null;
              nextGrid[slideY * width + slideRightX] = cell;
            }
          }
          continue;
        }
      }
    }

    gridRef.current = nextGrid;
    setParticleCount(count);

    // Audio reactive hiss
    if (sizzleTriggered) {
      audio.playSizzle(true);
    } else {
      audio.playSizzle(false);
    }
  };

  const hasNeighbor = (grid: Array<SandboxElement | null>, x: number, y: number, type: ElementType): boolean => {
    const offsets = [
      { dx: 1, dy: 0 },
      { dx: -1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: 0, dy: -1 },
      { dx: 1, dy: 1 },
      { dx: -1, dy: 1 },
      { dx: 1, dy: -1 },
      { dx: -1, dy: -1 },
    ];
    for (const offset of offsets) {
      const nx = x + offset.dx;
      const ny = y + offset.dy;
      if (isValid(nx, ny)) {
        if (grid[ny * width + nx]?.type === type) return true;
      }
    }
    return false;
  };

  const isEmpty = (grid: Array<SandboxElement | null>, x: number, y: number): boolean => {
    if (!isValid(x, y)) return false;
    return grid[y * width + x] === null;
  };

  const isValid = (x: number, y: number): boolean => {
    return x >= 0 && x < width && y >= 0 && y < height;
  };

  // IGNITION & CHEMICAL EXPLOSION LOGIC
  const igniteCell = (x: number, y: number, cell: SandboxElement, nextGrid: Array<SandboxElement | null>) => {
    const i = y * width + x;
    if (cell.type === 'powder_sulfur') {
      nextGrid[i] = { type: 'fire', color: '#fdd835', life: 15 };
    } else if (cell.type === 'powder_charcoal') {
      nextGrid[i] = { type: 'fire', color: '#ff3d00', life: 30 };
    } else if (cell.type === 'custom_mixture' && cell.mixtureId) {
      const mix = inventory.mixtures.find(m => m.id === cell.mixtureId);
      if (mix) {
        if (mix.properties.explosiveness > 0.3) {
          triggerExplosion(x, y, 6 + Math.round(mix.properties.explosiveness * 12), mix.properties.flashPotential, nextGrid);
        } else {
          nextGrid[i] = { type: 'fire', color: mix.color, life: 25 };
        }
      }
    }
  };

  const triggerExplosion = (cx: number, cy: number, radius: number, isFlash: boolean, nextGrid: Array<SandboxElement | null>) => {
    audio.playExplosion(radius / 8);
    
    for (let x = -radius; x <= radius; x++) {
      for (let y = -radius; y <= radius; y++) {
        const nx = cx + x;
        const ny = cy + y;
        if (isValid(nx, ny)) {
          const dist = x * x + y * y;
          if (dist <= radius * radius) {
            const idx = ny * width + nx;
            if (dist < (radius * radius) * 0.4) {
              // Core shockwave vaporizes items or creates intense fire
              nextGrid[idx] = isFlash 
                ? { type: 'fire', color: '#ffffff', life: 8 } 
                : { type: 'fire', color: '#ff7300', life: 15 + Math.random() * 15 };
            } else if (Math.random() < 0.6) {
              nextGrid[idx] = { type: 'smoke', color: '#718096', life: 12 + Math.random() * 12 };
            }
          }
        }
      }
    }
  };

  const triggerThermiteBlast = (cx: number, cy: number, nextGrid: Array<SandboxElement | null>) => {
    audio.playExplosion(0.6); // metallic crackle boom
    const radius = 6;
    
    for (let x = -radius; x <= radius; x++) {
      for (let y = -radius; y <= radius; y++) {
        const nx = cx + x;
        const ny = cy + y;
        if (isValid(nx, ny)) {
          const dist = x * x + y * y;
          if (dist <= radius * radius) {
            const idx = ny * width + nx;
            if (Math.random() < 0.4) {
              // High heat converts stones and elements into flowing molten Lava!
              nextGrid[idx] = { type: 'lava', color: '#ff3700' };
            } else if (Math.random() < 0.7) {
              nextGrid[idx] = { type: 'fire', color: '#ffb300', life: 10 };
            }
          }
        }
      }
    }
  };

  const growVines = (cx: number, cy: number, nextGrid: Array<SandboxElement | null>) => {
    // Spawns vertical mossy vine columns that crawl upwards!
    const length = 4 + Math.floor(Math.random() * 5);
    for (let y = 0; y < length; y++) {
      const ny = cy - y;
      if (isValid(cx, ny) && (isEmpty(gridRef.current, cx, ny) || gridRef.current[ny * width + cx]?.type === 'water')) {
        nextGrid[ny * width + cx] = { type: 'plant', color: '#38a169' };
      }
    }
    audio.playBubble();
  };

  // Rendering engine to display cells on Canvas
  const renderCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Use fast pixel manipulation for crisp 120x80 canvas
    const imgData = ctx.createImageData(width, height);
    const data = imgData.data;

    const grid = gridRef.current;

    for (let i = 0; i < grid.length; i++) {
      const cell = grid[i];
      const pixelIdx = i * 4;

      if (!cell) {
        // Deep space alchemist dark background
        data[pixelIdx] = 11;     // R
        data[pixelIdx + 1] = 15; // G
        data[pixelIdx + 2] = 25; // B
        data[pixelIdx + 3] = 255; // Alpha
      } else {
        // Simple fast parsing of custom color strings (RGB or Hex)
        let r = 255, g = 255, b = 255;
        const col = cell.color;

        if (col.startsWith('#')) {
          const hex = col.replace('#', '');
          r = parseInt(hex.substring(0, 2), 16);
          g = parseInt(hex.substring(2, 4), 16);
          b = parseInt(hex.substring(4, 6), 16);
        } else if (col.startsWith('rgb')) {
          const match = col.match(/\d+/g);
          if (match) {
            r = parseInt(match[0]);
            g = parseInt(match[1]);
            b = parseInt(match[2]);
          }
        }

        // Add visual flicker for fire/lava
        if (cell.type === 'fire') {
          const f = Math.random() * 40;
          r = Math.min(255, r + f);
          g = Math.max(0, g - f);
        }

        data[pixelIdx] = r;
        data[pixelIdx + 1] = g;
        data[pixelIdx + 2] = b;
        data[pixelIdx + 3] = 255;
      }
    }

    ctx.putImageData(imgData, 0, 0);
  };

  // Canvas drawing handlers (mouse/touch)
  const drawAtCoords = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;

    const canvasX = Math.floor((clientX - rect.left) * scaleX);
    const canvasY = Math.floor((clientY - rect.top) * scaleY);

    if (canvasX >= 0 && canvasX < width && canvasY >= 0 && canvasY < height) {
      applyBrush(canvasX, canvasY);
    }
  };

  const applyBrush = (cx: number, cy: number) => {
    const grid = gridRef.current;
    const size = brushSize;

    for (let x = -size; x <= size; x++) {
      for (let y = -size; y <= size; y++) {
        const nx = cx + x;
        const ny = cy + y;
        if (isValid(nx, ny)) {
          // Circle brush
          if (x*x + y*y <= size*size) {
            const idx = ny * width + nx;
            
            if (selectedBrush === 'empty') {
              grid[idx] = null;
            } else {
              // Spawn chosen element with custom properties
              let elem: SandboxElement = { type: selectedBrush, color: '#ffffff' };
              
              if (selectedBrush === 'stone') elem.color = '#718096';
              else if (selectedBrush === 'wood') elem.color = '#81e6d9';
              else if (selectedBrush === 'water') elem.color = '#3182ce';
              else if (selectedBrush === 'fire') {
                elem.color = '#f56565';
                elem.life = 15 + Math.random() * 20;
              } else if (selectedBrush === 'acid') elem.color = '#48bb78';
              else if (selectedBrush === 'lava') elem.color = '#dd6b20';
              else if (selectedBrush === 'oil') elem.color = '#2d3748';
              else if (selectedBrush === 'spark') elem.color = '#319795';
              else if (selectedBrush === 'sand') elem.color = '#ecc94b';
              else if (selectedBrush === 'powder_charcoal') elem.color = '#12161a';
              else if (selectedBrush === 'powder_sulfur') elem.color = '#f6e05e';
              else if (selectedBrush === 'powder_saltpeter') elem.color = '#f7fafc';
              else if (selectedBrush === 'powder_iron') elem.color = '#718096';
              else if (selectedBrush === 'powder_rust') elem.color = '#c05621';
              else if (selectedBrush === 'powder_aluminium') elem.color = '#cbd5e0';
              else if (selectedBrush === 'powder_cobalt') elem.color = '#3182ce';
              else if (selectedBrush === 'powder_silver') elem.color = '#a0aec0';
              else if (selectedBrush === 'powder_mercury') elem.color = '#718096';
              else if (selectedBrush === 'powder_lumina') {
                elem.color = '#4fd1c5';
                elem.glow = true;
              } else if (selectedBrush === 'powder_phosphor') {
                elem.color = '#48bb78';
                elem.glow = true;
              } else if (selectedBrush === 'custom_mixture' && activeMixture) {
                // Fetch details of active custom mixture
                elem.color = activeMixture.color;
                elem.mixtureId = activeMixture.id;
                if (activeMixture.properties.glow) {
                  elem.glow = true;
                }
              }

              grid[idx] = elem;
            }
          }
        }
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDrawing.current = true;
    audio.resume();
    drawAtCoords(e.clientX, e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDrawing.current) {
      drawAtCoords(e.clientX, e.clientY);
    }
  };

  const handleMouseUpOrLeave = () => {
    isDrawing.current = false;
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches[0]) {
      isDrawing.current = true;
      audio.resume();
      drawAtCoords(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (isDrawing.current && e.touches[0]) {
      drawAtCoords(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const clearChamber = () => {
    gridRef.current = Array(width * height).fill(null);
    setParticleCount(0);
    audio.playExplosion(0.1);
    onShowMessage("Chamber sterilized.", "info");
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 h-full p-1" id="sandbox-chamber-root">
      {/* Simulation Workspace Panel */}
      <div className="xl:col-span-8 flex flex-col gap-4">
        {/* Top telemetry bar */}
        <div className="bg-[#0a0a0f] border border-white/10 rounded p-3 px-4 flex justify-between items-center text-xs font-mono">
          <div className="flex gap-4 items-center">
            <span className="flex items-center gap-1.5 text-white/50">
              <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
              Particles: <strong className="text-emerald-400">{particleCount}</strong>
            </span>
            <span className="text-white/10">|</span>
            <span className="text-white/50">
              Grid: <strong className="text-white">120x80</strong>
            </span>
          </div>
          <div className="flex gap-2">
            <button
              id="clear-chamber-btn"
              onClick={clearChamber}
              className="flex items-center gap-1.5 py-1 px-2.5 rounded bg-white/5 border border-white/10 hover:border-red-500/50 hover:text-red-400 font-mono text-[10px] font-bold text-white/60 uppercase tracking-wider transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Purge
            </button>
            <button
              onClick={exportChamber}
              className="flex items-center gap-1.5 py-1 px-2.5 rounded bg-white/5 border border-white/10 hover:border-cyan-500/50 hover:text-cyan-400 font-mono text-[10px] font-bold text-white/60 uppercase tracking-wider transition-colors"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              Snapshot
            </button>
          </div>
        </div>

        {/* The Sandbox Canvas Interactive Screen */}
        <div className="bg-[#050507] border-2 border-white/15 rounded-lg overflow-hidden aspect-[3/2] w-full flex items-center justify-center relative group shadow-2xl">
          <canvas
            id="sandbox-canvas"
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUpOrLeave}
            onMouseLeave={handleMouseUpOrLeave}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleMouseUpOrLeave}
            className="w-full h-full cursor-crosshair select-none rendering-pixelated touch-none"
            style={{ imageRendering: 'pixelated' }}
          />

          {/* Quick Gravity overlay badge */}
          <div className="absolute top-3 left-3 bg-black/80 backdrop-blur border border-white/10 px-2 py-1 rounded text-[9px] font-mono text-cyan-400 flex items-center gap-1">
            <ArrowDown className={`w-3 h-3 ${gravityMode === 'up' ? 'rotate-180' : gravityMode === 'left' ? 'rotate-90' : gravityMode === 'right' ? '-rotate-90' : ''}`} />
            Gravity: {gravityMode.toUpperCase()}
          </div>
        </div>

        {/* Live Controller Buttons */}
        <div className="bg-[#0a0a0f] border border-white/10 rounded-lg p-3 flex gap-3 items-center justify-between">
          <div className="flex gap-2">
            <button
              id="play-pause-btn"
              onClick={() => {
                setIsPlaying(!isPlaying);
                audio.playSpark();
              }}
              className={`flex items-center gap-2 py-2 px-4 rounded font-sans font-bold text-xs uppercase tracking-wider transition-all border ${
                isPlaying
                  ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50 hover:bg-cyan-500/30'
                  : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 hover:bg-emerald-500/30'
              }`}
            >
              {isPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  Pause Sandbox
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Run Sandbox
                </>
              )}
            </button>
            
            <button
              id="step-sim-btn"
              onClick={() => {
                updatePhysics();
                renderCanvas();
                audio.playSpark();
              }}
              disabled={isPlaying}
              className="p-2 bg-white/5 border border-white/10 rounded text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-30 transition-all"
              title="Single Physics Step"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Gravity Modulator */}
          <div className="flex gap-1.5 items-center bg-black/40 p-1 rounded border border-white/10">
            {['down', 'zero', 'up', 'left', 'right'].map((mode) => {
              const active = gravityMode === mode;
              const unlocked = mode === 'down' || mode === 'zero' || inventory.level >= 2;
              return (
                <button
                  key={mode}
                  id={`gravity-btn-${mode}`}
                  onClick={() => {
                    if (!unlocked) {
                      onShowMessage("Reach Level 2 to unlock custom gravity vectors!", 'error');
                      return;
                    }
                    setGravityMode(mode as any);
                    audio.playSpark();
                  }}
                  className={`text-[9px] font-mono px-2 py-1 rounded transition-all uppercase tracking-wider ${
                    active 
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 font-bold' 
                      : unlocked 
                        ? 'text-white/40 hover:text-white' 
                        : 'text-white/10 cursor-not-allowed line-through'
                  }`}
                >
                  {mode}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right: Brush Palette & Elements Selection */}
      <div className="xl:col-span-4 flex flex-col gap-4">
        {/* Brush adjustments */}
        <div className="bg-[#0a0a0f] border border-white/10 rounded-lg p-4 flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <h3 className="font-display font-bold text-white uppercase tracking-wider text-xs flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-cyan-400" />
              Nozzle & Brush Controls
            </h3>
            <span className="font-mono text-[10px] text-white/40">Radius: {brushSize}px</span>
          </div>
          <div className="flex gap-2">
            {[1, 2, 4, 7].map((size) => (
              <button
                key={size}
                id={`brush-size-${size}`}
                onClick={() => setBrushSize(size)}
                className={`flex-1 py-1 px-1.5 rounded border text-[10px] font-mono transition-all ${
                  brushSize === size
                    ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400 font-bold shadow-[0_0_8px_rgba(6,182,212,0.2)]'
                    : 'bg-white/5 border-white/5 hover:border-white/10 text-white/50'
                }`}
              >
                {size === 1 ? 'Fine (1px)' : size === 2 ? 'Small (2px)' : size === 4 ? 'Med (4px)' : 'Wide (7px)'}
              </button>
            ))}
          </div>
        </div>

        {/* Materials Palette drawer */}
        <div className="bg-[#0a0a0f] border border-white/10 rounded-lg p-4 flex flex-col gap-3 flex-1">
          <h3 className="font-display font-bold text-white uppercase tracking-wider text-xs pb-1.5 border-b border-white/10">
            Dispenser Materials
          </h3>
          
          <div className="flex flex-col gap-4 overflow-y-auto max-h-[380px] pr-1">
            {/* Standard Sandbox Elements */}
            <div>
              <span className="text-[10px] font-mono text-white/40 uppercase tracking-wider block mb-1.5">Fluids & Solids</span>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { type: 'empty', label: 'Erase', color: '#3182ce', bg: 'border-dashed border-red-500/30 hover:bg-red-500/10' },
                  { type: 'sand', label: 'Sand', color: '#ecc94b', bg: 'bg-[#ecc94b]/10 hover:bg-[#ecc94b]/20 border-[#ecc94b]/20' },
                  { type: 'water', label: 'Water', color: '#3182ce', bg: 'bg-[#3182ce]/10 hover:bg-[#3182ce]/20 border-[#3182ce]/20' },
                  { type: 'stone', label: 'Stone', color: '#718096', bg: 'bg-[#718096]/10 hover:bg-[#718096]/20 border-[#718096]/20' },
                  { type: 'wood', label: 'Wood', color: '#ed8936', bg: 'bg-[#ed8936]/10 hover:bg-[#ed8936]/20 border-[#ed8936]/20' },
                  { type: 'fire', label: 'Fire', color: '#e53e3e', bg: 'bg-[#e53e3e]/10 hover:bg-[#e53e3e]/20 border-[#e53e3e]/20' },
                  { type: 'acid', label: 'Acid', color: '#48bb78', bg: 'bg-[#48bb78]/10 hover:bg-[#48bb78]/20 border-[#48bb78]/20' },
                  { type: 'lava', label: 'Lava', color: '#dd6b20', bg: 'bg-[#dd6b20]/10 hover:bg-[#dd6b20]/20 border-[#dd6b20]/20' },
                  { type: 'oil', label: 'Oil', color: '#4a5568', bg: 'bg-[#4a5568]/10 hover:bg-[#4a5568]/20 border-[#4a5568]/20' },
                  { type: 'spark', label: 'Spark', color: '#319795', bg: 'bg-[#319795]/10 hover:bg-[#319795]/20 border-[#319795]/20' },
                ].map((item) => {
                  const active = selectedBrush === item.type;
                  return (
                    <button
                      key={item.type}
                      id={`brush-elem-${item.type}`}
                      onClick={() => {
                        setSelectedBrush(item.type as any);
                        audio.playSpark();
                      }}
                      className={`py-2 px-1.5 rounded border text-[10px] font-sans font-medium text-center transition-all ${
                        active
                          ? 'bg-cyan-500/20 text-cyan-400 font-bold border-cyan-500/50 shadow-md shadow-cyan-500/10'
                          : `text-white/80 bg-white/5 border-white/5 ${item.bg}`
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom formulated Powders Drawer */}
            <div>
              <span className="text-[10px] font-mono text-white/40 uppercase tracking-wider block mb-1.5">Your Synthesized Compounds</span>
              <div className="flex flex-col gap-1.5">
                {inventory.mixtures.length === 0 ? (
                  <div className="text-center py-4 border border-dashed border-white/10 rounded text-white/30 font-sans text-[11px]">
                    No custom blends synthesized yet.<br />Go to Mixing Station tab!
                  </div>
                ) : (
                  inventory.mixtures.map((mix) => {
                    const active = selectedBrush === 'custom_mixture' && selectedMixtureId === mix.id;
                    return (
                      <button
                        key={mix.id}
                        id={`brush-mixture-${mix.id}`}
                        onClick={() => {
                          setSelectedBrush('custom_mixture');
                          setSelectedMixtureId(mix.id);
                          audio.playSpark();
                        }}
                        className={`p-2.5 rounded border text-left flex justify-between items-center transition-all relative overflow-hidden ${
                          active
                            ? 'border-cyan-500/50 bg-cyan-950/20 text-cyan-400'
                            : 'border-white/5 bg-white/5 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-2 z-10">
                          <span className="w-2.5 h-2.5 rounded-sm border border-white/10 shadow" style={{ backgroundColor: mix.color }} />
                          <div>
                            <span className="font-sans font-bold text-xs text-white block truncate max-w-[140px]">
                              {mix.name}
                            </span>
                            <span className="text-[9px] font-mono text-white/40 uppercase">Yield: {mix.grade}</span>
                          </div>
                        </div>

                        {/* Badges showing special powers */}
                        <div className="flex gap-1 z-10">
                          {mix.properties.explosiveness > 0.3 && (
                            <span className="text-[8px] bg-red-500/25 border border-red-500/30 text-red-400 font-bold px-1 rounded">BOOM</span>
                          )}
                          {mix.properties.antiGravity > 0.4 && (
                            <span className="text-[8px] bg-cyan-500/25 border border-cyan-500/30 text-cyan-400 font-bold px-1 rounded">FLOAT</span>
                          )}
                          {mix.properties.growthFactor > 0.3 && (
                            <span className="text-[8px] bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 font-bold px-1 rounded">BLOOM</span>
                          )}
                          {mix.properties.glow && (
                            <span className="text-[8px] bg-purple-500/25 border border-purple-500/30 text-purple-400 font-bold px-1 rounded">GLOW</span>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
