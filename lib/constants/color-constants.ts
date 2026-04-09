/**
 * Centralized color constants for the entire project.
 * 
 * 1. THEME: Semantic aliases mapping to CSS variables (for React UI).
 * 2. JS_PALETTE: Raw hex values for engine logic (hue rotation, luminance).
 */

/**
 * Functional theme that uses CSS variables for dynamic switching.
 * Values are defined in globals.css (supports Light and Dark modes).
 */
export const THEME = {
  // --- COMMON SEMANTICS ---
  common: {
    white: "var(--bg-card, #FFFFFF)",
    black: "var(--text-main, #000000)",
    ally: "var(--color-ally, #3B82F6)",
    ally_bg: "var(--color-ally-bg, #DBEAFE)",
    ally_text: "var(--color-ally-text, #1D4ED8)",
    opponent: "var(--color-opp, #EF4444)",
    opponent_bg: "var(--color-opp-bg, #FEE2E2)",
    opponent_text: "var(--color-opp-text, #B91C1C)",
    hp: {
      high: "var(--color-hp-high, #22C55E)",
      mid: "var(--color-hp-mid, #F97316)",
      low: "var(--color-hp-low, #EF4444)",
    },
    success: "var(--color-success, #10B981)",
    error: "var(--color-error, #DC2626)",
    error_bg: "var(--color-opp-bg, #FEE2E2)",
    error_text: "var(--color-opp-text, #B91C1C)",
    warning: "var(--color-warning, #EA580C)",
    item: "var(--color-item, #B45309)",
    neutral: "var(--color-neutral, #CBD5E1)",
    disabled: "var(--color-disabled, #94A3B8)",
    ally_bg_tint: "var(--color-ally-bg-tint, color-mix(in srgb, var(--color-ally) 8%, transparent))",
    opponent_bg_tint: "var(--color-opp-bg-tint, color-mix(in srgb, var(--color-opp) 8%, transparent))",
    ability: "var(--color-warning, #F59E0B)",
    ko: "var(--color-ko, #ff0055)",
    tree_root: "var(--color-tree-root, #ccff00)",
  },

  // --- COMPONENT: POKEMON TYPES ---
  pokemon_types: {
    ghost: "var(--type-ghost, #9333EA)",
    ice: "var(--type-ice, #7DD3FC)",
    dragon: "var(--type-dragon, #4F46E5)",
    fighting: "var(--type-fighting, #BE123C)",
    steel: "var(--type-steel, #A1A1AA)",
    fairy: "var(--type-fairy, #F472B6)",
    dark: "var(--type-dark, #404040)",
    electric: "var(--type-electric, #FACC15)",
    fire: "var(--type-fire, #F97316)",
    ground: "var(--type-ground, #FCD34D)",
    poison: "var(--type-poison, #A21CAF)",
    rock: "var(--type-rock, #B45309)",
    bug: "var(--type-bug, #84CC16)",
    grass: "var(--type-grass, #22C55E)",
    psychic: "var(--type-psychic, #EC4899)",
    flying: "var(--type-flying, #A78BFA)",
    normal: "var(--type-normal, #A1A1AA)",
    water: "var(--type-water, #3B82F6)",
    stellar: "var(--type-stellar, #2DD4BF)",
  },

  // --- PAGE: BATTLEFIELD ZONE ---
  battlefield: {
    main_border: "var(--border-main, #CBD5E1)",
    title_text: "var(--text-title, #334155)",
    side_bg: "var(--bg-side, #F8FAFC)",
    side_label_ally: "var(--color-ally-text, #1D4ED8)",
    side_label_opponent: "var(--color-opp-text, #B91C1C)",
    side_border_ally: "var(--color-ally, #3B82F6)",
    side_border_opponent: "var(--color-opp, #EF4444)",
    main_bg: "var(--bg-card, #FFFFFF)",
  },

  // --- COMPONENT: POKEMON CARD ---
  pokemon_card: {
    header: {
      expand_icon: "var(--icon-low, #94A3B8)",
      expand_icon_hover: "var(--icon-high, #475569)",
      move_icon: "var(--icon-low, #94A3B8)",
      move_icon_hover: "var(--icon-high, #1E293B)",
      tera_inactive: "var(--icon-low, #94A3B8)",
      mega_inactive: "var(--icon-low, #94A3B8)",
      marker_ko_bg: "var(--bg-ko, #94A3B8)",
      marker_ko_text: "var(--color-opp-text, #7F1D1D)",
    },
    status: {
      label: "var(--text-dim, #475569)",
      counter_text: "var(--text-dim, #64748B)",
      toggle_plus: "var(--bg-neutral, #CBD5E1)",
      toggle_text: "var(--text-dim, #475569)",
      colors: {
        brn: "var(--status-brn)",
        par: "var(--status-par)",
        slp: "var(--status-slp)",
        frz: "var(--status-frz)",
        psn: "var(--status-psn)",
        tox: "var(--status-tox)",
      },
    }
  },

  // --- COMPONENT: BATTLE TREE ---
  battle_tree: {
    branch_root_color: "var(--color-tree-root, #ccff00)",
    branch_base: "var(--color-ally, #60A5FA)",
    node_corrupted: "var(--color-opp, #EF4444)",
    node_corrupted_bg: "var(--color-opp-bg, #FEE2E2)",
    node_corrupted_text: "var(--color-opp-text, #B91C1C)",
    node_bg: "var(--bg-card, #FFFFFF)",
    zoom_label_bg: "var(--bg-side, #F8FAFC)",
    container_bg: "var(--bg-app, #F8FAFC)",
    description_text: "var(--text-dim, #64748B)",
    node_description_badge: "var(--color-hp-mid, #FBBF24)",
    node_description_badge_text: "var(--color-white, #78350F)",
  },

  // --- COMPONENT: COUNTER ---
  counter: {
    bg: "var(--bg-neutral, #E2E8F0)",
    text: "var(--text-main, #475569)",
  },

  // --- COMPONENT: SESSION MENU ---
  session_menu: {
    scrollbar_bg: "var(--bg-neutral-low, #F1F5F9)",
    scrollbar_thumb: "var(--border-main, #CBD5E1)",
    scrollbar_thumb_hover: "var(--text-dim, #64748B)",
    item_hover_bg: "var(--bg-neutral-low, #F1F5F9)",
    item_active_bg: "color-mix(in srgb, var(--color-ally) 12%, transparent)",
    item_active_text: "var(--color-ally, #3B82F6)",
    item_text: "var(--text-main, #0F172A)",
    item_subtext: "var(--text-dim, #64748B)",
    border: "var(--border-main, #CBD5E1)",
  },

  // --- COMPONENT: OTHERS EFFECTS MARKERS ---
  effects: {
    markers: {
      green: "var(--color-success, #22C55E)",
      blue: "var(--color-ally, #3B82F6)",
      red: "var(--color-error, #EF4444)",
      gray: "var(--color-disabled, #94A3B8)",
    }
  },

  // --- COMPONENT: EDITABLE TEXT ---
  editable_text: {
    default_empty: "var(--color-neutral, #CBD5E1)",
    default_main: "var(--color-ally, #3B82F6)",
    // Hex equivalents for JS color computation (darkenColor, lightenColor cannot parse CSS vars).
    primary_light: "#3b82f6", 
    primary_dark:  "#ccff00", 
    opponent_light: "#EF4444",
    opponent_dark: "#FF6600",
    neutral_light: "#64748b",
    neutral_dark:  "#94a3b8",
  },

  // --- COMPONENT: CUSTOM TAGS ---
  // NOTE: These MUST be raw hex values for JS functions (darkenColor)
  tags: {
    light: {
      base_bg: "#e2e8f0", base_text: "#334155",
      added_bg: "#d1fae5", added_text: "#065f46",
      renamed_bg: "#dbeafe", renamed_text: "#1d4ed8",
    },
    dark: {
      base_bg: "#475569", base_text: "#f8fafc",
      added_bg: "#059669", added_text: "#f0fdf4",
      renamed_bg: "#2563eb", renamed_text: "#eff6ff",
    },
  },

  // --- KO / UNCERTAINTY ---
  ko: {
    bordeaux: "var(--color-ko-deep, #500724)",
    uncertain: "var(--color-hp-mid, #F97316)",
    bg: "var(--bg-neutral-low, #F1F5F9)",
  },

  // --- COMPONENT: ROLLS HP BAR ---
  rolls_hp_bar: {
    avant_bar: "var(--color-rolls-main, #818CF8)",
    apres_bar: "var(--color-hp-high, #22C55E)",
    ko_zone_base: "var(--color-opp, #EF4444)",
    mean_marker: "var(--bg-card, #FFFFFF)",
  },

  // --- COMPONENT: TOOLTIPS ---
  tooltips: {
    bg: "var(--tooltip-bg, #FFFFFF)",
    text: "var(--tooltip-text, #0F172A)",
  },

  // --- COMPONENT: SUGGESTION LIST ---
  suggestion_list: {
    bg: "var(--bg-card, #FFFFFF)",
    border: "var(--border-main, #CBD5E1)",
    item_hover: "var(--bg-neutral-low, #F1F5F9)",
    item_selected: "var(--color-ally-bg-tint, color-mix(in srgb, var(--color-ally) 8%, transparent))",
    text_main: "var(--text-main, #0F172A)",
    text_dim: "var(--text-dim, #64748B)",
    footer_bg: "var(--bg-neutral-low, #F1F5F9)",
  }
} as const;

/**
 * JS-Specific Palette.
 * These are RAW hex codes used by the Battle Engine and Utility functions.
 * Must be manually kept in sync with globals.css for visual parity.
 */
export const JS_PALETTE = {
  // Battle Tree Root (JS Hue cycle)
  battle_tree_root: {
    light: "#3b82f6", 
    dark: "#ccff00"
  },
  
  // Pokemon Types (Engine logic)
  pokemon_types: {
    light: {
      ghost: "#9333EA", ice: "#7DD3FC", dragon: "#4F46E5", fighting: "#BE123C",
      steel: "#A1A1AA", fairy: "#F472B6", dark: "#404040", electric: "#FACC15",
      fire: "#F97316", ground: "#FCD34D", poison: "#A21CAF", rock: "#B45309",
      bug: "#84CC16", grass: "#22C55E", psychic: "#EC4899", flying: "#A78BFA",
      normal: "#A1A1AA", water: "#3B82F6", stellar: "#2DD4BF"
    },
    dark: {
      ghost: "#CC00FF", ice: "#00FFFF", dragon: "#6600FF", fighting: "#FF3300",
      steel: "#E0E0E0", fairy: "#FF66CC", dark: "#1A1A1A", electric: "#FFFF00",
      fire: "#FF6600", ground: "#FFCC00", poison: "#AA00FF", rock: "#CC9933",
      bug: "#CCFF00", grass: "#33FF00", psychic: "#FF0099", flying: "#9966FF",
      normal: "#FFFFFF", water: "#0066FF", stellar: "#00FFCC"
    }
  },
  
  // Status (Engine logic)
  status: {
    light: {
      brn: "#F97316", par: "#EAB308", slp: "#94A3B8", frz: "#38BDF8", psn: "#A855F7", tox: "#7E22CE"
    },
    dark: {
      brn: "#FF4400", par: "#FFFF00", slp: "#66CCFF", frz: "#CCFFFF", psn: "#AA00FF", tox: "#FF00FF"
    }
  }
} as const;

/**
 * Compatibility Layer: Exporting PALETTE pointing to JS_PALETTE 
 * for files already using this identifier.
 */
export const PALETTE = JS_PALETTE;
