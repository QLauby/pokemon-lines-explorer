"use client"

import { toShowdownId } from "@/lib/utils/pokedex-utils";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils/cn";

interface PokemonSpriteProps {
  name: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Convertit un nom de Pokémon en ID compatible avec PokemonDB.
 */
function toPokemonDBId(name: string): string {
  if (!name) return "";
  const id = toShowdownId(name);
  
  const mapping: Record<string, string> = {
    "ogerpon": "ogerpon",
    "ogerpontealm": "ogerpon-teal-mask",
    "ogerponwellspring": "ogerpon-wellspring",
    "ogerponhearthflame": "ogerpon-hearthflame",
    "ogerponcornerstone": "ogerpon-cornerstone",
    "basculegionf": "basculegion-female",
    "basculegionm": "basculegion-male",
    "nidoranm": "nidoran-m",
    "nidoranf": "nidoran-f",
    "mr-mime": "mr-mime",
    "farfetchd": "farfetchd",
    "sirfetchd": "sirfetchd",
  };

  if (mapping[id]) return mapping[id];
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

/**
 * Convertit un nom de Pokémon en ID compatible avec Pokesprite (GitHub).
 */
function toPokespriteId(name: string): string {
  if (!name) return "";
  const id = toShowdownId(name);

  const specialCases: Record<string, string> = {
    "nidoranm": "nidoran-m",
    "nidoranf": "nidoran-f",
    "ogerpon": "ogerpon-teal-mask",
    "ogerpontealm": "ogerpon-teal-mask",
    "ogerponwellspring": "ogerpon-wellspring-mask",
    "ogerponhearthflame": "ogerpon-hearthflame-mask",
    "ogerponcornerstone": "ogerpon-cornerstone-mask",
    "basculegionf": "basculegion-female",
    "basculegionm": "basculegion",
    "tapukoko": "tapu-koko",
    "tapulele": "tapu-lele",
    "tapubulu": "tapu-bulu",
    "tapufini": "tapu-fini",
  };

  if (specialCases[id]) return specialCases[id];
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function PokemonSprite({ name, className, style }: PokemonSpriteProps) {
  const showdownId = toShowdownId(name);
  const pokespriteId = toPokespriteId(name);
  const pdbId = toPokemonDBId(name);
  
  const [sourceIndex, setSourceIndex] = useState(0);
  const [failed, setFailed] = useState(false);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  
  const sources = [
    `https://img.pokemondb.net/sprites/scarlet-violet/icon/avif/${pdbId}.avif`,
    `https://img.pokemondb.net/sprites/scarlet-violet/normal/${pdbId}.png`,
    `https://img.pokemondb.net/sprites/brilliant-diamond-shining-pearl/normal/${pdbId}.png`,
    `https://raw.githubusercontent.com/msikma/pokesprite/master/pokemon-gen8/regular/${pokespriteId}.png`,
    `https://raw.githubusercontent.com/msikma/pokesprite/master/pokemon-gen7x/regular/${pokespriteId}.png`,
    `https://raw.githubusercontent.com/bamq/pokemon-sprites/main/pokemon/regular/${pokespriteId}.png`,
    `https://raw.githubusercontent.com/msikma/pokesprite/master/icons/pokemon/regular/${pokespriteId}.png`,
    `https://play.pokemonshowdown.com/sprites/gen5/${showdownId}.png`,
  ];

  useEffect(() => {
    setSourceIndex(0);
    setFailed(false);
    setProcessedUrl(null);
  }, [showdownId]);

  const handleProcessImage = () => {
    const img = imgRef.current;
    if (!img) return;

    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) {
        setProcessedUrl(img.src);
        return;
      }

      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.drawImage(img, 0, 0);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      let minX = canvas.width, minY = canvas.height, maxX = -1, maxY = -1;
      let hasContent = false;

      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          const idx = (y * canvas.width + x) * 4;
          const alpha = data[idx + 3];
          const r = data[idx], g = data[idx+1], b = data[idx+2];
          
          const isWhite = r > 250 && g > 250 && b > 250;
          if (alpha > 5 && !isWhite) { 
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
            hasContent = true;
          }
        }
      }

      if (!hasContent) {
        setProcessedUrl(img.src);
        return;
      }

      const contentW = maxX - minX + 1;
      const contentH = maxY - minY + 1;
      const margin = 1;
      const targetSize = Math.max(contentW, contentH) + (margin * 2);
      
      const finalCanvas = document.createElement("canvas");
      finalCanvas.width = targetSize;
      finalCanvas.height = targetSize;
      const finalCtx = finalCanvas.getContext("2d");
      
      if (!finalCtx) {
        setProcessedUrl(img.src);
        return;
      }

      finalCtx.drawImage(
        img,
        minX, minY, contentW, contentH,
        (targetSize - contentW) / 2, (targetSize - contentH) / 2, contentW, contentH
      );

      setProcessedUrl(finalCanvas.toDataURL());
    } catch (e) {
      setProcessedUrl(img.src);
    }
  };

  if (!showdownId || failed) return null;

  if (processedUrl) {
    return (
      <img
        src={processedUrl}
        alt={name}
        className={cn("object-contain", className)}
        style={{ imageRendering: 'pixelated', ...style }}
        loading="lazy"
      />
    );
  }

  // Utilisation d'un proxy pour forcer le CORS et permettre le détourage
  const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(sources[sourceIndex])}`;

  return (
    <img
      ref={imgRef}
      src={proxyUrl}
      crossOrigin="anonymous" // Fonctionne maintenant grâce au proxy
      alt=""
      className="hidden"
      onLoad={handleProcessImage}
      onError={() => {
        if (sourceIndex < sources.length - 1) {
          setSourceIndex(prev => prev + 1);
        } else {
          setFailed(true);
        }
      }}
    />
  );
}
