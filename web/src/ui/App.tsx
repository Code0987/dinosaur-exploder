import { useEffect, useMemo, useRef, useState, type ButtonHTMLAttributes, type PointerEvent, type ReactNode, type RefObject } from "react";
import { ACHIEVEMENTS, achievementText } from "../game/achievements";
import { asset, loadArt, type Art } from "../game/assets";
import { audio } from "../game/audio";
import { MODES, SPECIALTIES, type GameModeId, type SpecialtyId } from "../game/constants";
import { createPad, startLoop, type ControlPad } from "../game/engine";
import { LANGUAGES, loadDictionary, t } from "../game/i18n";
import { loadSave, persistSave, type SaveData } from "../game/save";
import { createWorld, formatSurvived, type World } from "../game/sim";
import { lockMessage, shipLock, specialtyLock, weaponLock } from "../game/unlocks";

type Screen =
  | "menu"
  | "ship"
  | "weapon"
  | "specialty"
  | "difficulty"
  | "options"
  | "achievements"
  | "play";

export function App() {
  const [save, setSave] = useState<SaveData>(() => loadSave());
  const [dict, setDict] = useState<Record<string, string>>({});
  const [screen, setScreen] = useState<Screen>("menu");
  const [ship, setShip] = useState(1);
  const [weapon, setWeapon] = useState(1);
  const [specialty, setSpecialty] = useState<SpecialtyId>("none");
  const [mode, setMode] = useState<GameModeId>("NORMAL");
  const [notice, setNotice] = useState<string | null>(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    audio.apply(save.settings);
    loadDictionary(save.settings.language)
      .then((next) => {
        setDict(next);
        setBooting(false);
      })
      .catch(() => setBooting(false));
  }, [save.settings.language]);

  useEffect(() => {
    const unlock = () => audio.unlock();
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  useEffect(() => {
    if (screen !== "play") audio.playMusic("menu");
  }, [screen]);

  const refreshSave = () => setSave(loadSave());

  if (booting) {
    return (
      <Shell>
        <p className="text-lime-300">{t(dict, "loading")}...</p>
      </Shell>
    );
  }

  if (screen === "play") {
    return (
      <GameScreen
        dict={dict}
        save={save}
        ship={ship}
        weapon={weapon}
        specialty={specialty}
        mode={mode}
        onExit={() => {
          persistSave(save);
          refreshSave();
          setScreen("menu");
        }}
      />
    );
  }

  return (
    <Shell>
      <img src={asset("assets/textures/dinomenu.png")} alt="Dinosaur Exploder" className="w-full max-w-md" />
      {screen === "menu" && (
        <div className="flex w-full max-w-sm flex-col gap-3">
          <ArcadeButton label={t(dict, "start")} onClick={() => setScreen("ship")} />
          <ArcadeButton label={t(dict, "options")} onClick={() => setScreen("options")} />
          <ArcadeButton label={t(dict, "achievements")} onClick={() => setScreen("achievements")} />
          <p className="text-center text-[10px] text-lime-200/80">
            {(t(dict, "total_coins") || "Total coins").toUpperCase()}: {save.totalCoins}
          </p>
        </div>
      )}
      {screen === "ship" && (
        <Picker
          title={t(dict, "select_ship")}
          onBack={() => setScreen("menu")}
          backLabel={t(dict, "back")}
        >
          <div className="grid grid-cols-4 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((number) => {
              const locked = shipLock(number, save);
              return (
                <SelectTile
                  key={number}
                  src={asset(`assets/textures/spaceship${number}.png`)}
                  selected={ship === number}
                  locked={locked !== null}
                  onClick={() => {
                    if (locked) {
                      setNotice(lockMessage(dict, "ship_locked", locked));
                      return;
                    }
                    setShip(number);
                    setScreen("weapon");
                  }}
                />
              );
            })}
          </div>
        </Picker>
      )}
      {screen === "weapon" && (
        <Picker title={t(dict, "select_weapon")} onBack={() => setScreen("ship")} backLabel={t(dict, "back")}>
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((number) => {
              const locked = weaponLock(number, save);
              return (
                <SelectTile
                  key={number}
                  src={asset(`assets/textures/projectiles/projectile${ship}_${number}.png`)}
                  selected={weapon === number}
                  locked={locked !== null}
                  onClick={() => {
                    if (locked) {
                      setNotice(lockMessage(dict, "weapon_locked", locked));
                      return;
                    }
                    setWeapon(number);
                    setScreen("specialty");
                  }}
                />
              );
            })}
          </div>
        </Picker>
      )}
      {screen === "specialty" && (
        <Picker
          title={t(dict, "select_specialty")}
          onBack={() => setScreen("weapon")}
          backLabel={t(dict, "back")}
        >
          <div className="grid grid-cols-2 gap-3">
            {SPECIALTIES.map((item) => {
              const locked = specialtyLock(item.id, save);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    if (locked) {
                      setNotice(lockMessage(dict, "specialty_locked", locked));
                      return;
                    }
                    setSpecialty(item.id);
                  }}
                  className={`relative flex flex-col items-center gap-2 border-2 p-3 ${
                    specialty === item.id ? "border-lime-300 bg-lime-950/70" : "border-white/20 bg-black/50"
                  }`}
                >
                  <img src={asset(`assets/textures/${item.icon}`)} alt="" className="h-12 w-12 object-contain" />
                  <span className="text-[10px] uppercase">{t(dict, item.nameKey)}</span>
                  <span className="text-[8px] leading-4 text-white/70">{t(dict, item.descriptionKey)}</span>
                  {locked && <img src={asset("assets/textures/lock.png")} alt="" className="absolute top-1 right-1 h-5 w-5" />}
                </button>
              );
            })}
          </div>
          <ArcadeButton label={t(dict, "next")} onClick={() => setScreen("difficulty")} />
        </Picker>
      )}
      {screen === "difficulty" && (
        <Picker
          title={t(dict, "select_difficulty")}
          onBack={() => setScreen("specialty")}
          backLabel={t(dict, "back")}
        >
          <ModeButton mode="EASY" dict={dict} save={save} onPick={() => startMode("EASY")} />
          <ModeButton mode="NORMAL" dict={dict} save={save} onPick={() => startMode("NORMAL")} />
          <ModeButton mode="EXPERT" dict={dict} save={save} onPick={() => startMode("EXPERT")} />
        </Picker>
      )}
      {screen === "options" && (
        <Options
          dict={dict}
          save={save}
          onChange={(next) => {
            const updated = { ...save, settings: next };
            persistSave(updated);
            audio.apply(next);
            setSave(updated);
          }}
          onBack={() => setScreen("menu")}
        />
      )}
      {screen === "achievements" && (
        <Achievements dict={dict} save={save} onBack={() => setScreen("menu")} />
      )}
      {notice && <Notice text={notice} ok={t(dict, "ok")} onClose={() => setNotice(null)} />}
    </Shell>
  );

  function startMode(next: GameModeId) {
    setMode(next);
    setScreen("play");
  }
}

function ModeButton({
  mode,
  dict,
  save,
  onPick,
}: {
  mode: GameModeId;
  dict: Record<string, string>;
  save: SaveData;
  onPick: () => void;
}) {
  const label =
    mode === "EASY" ? t(dict, "easy_mode") : mode === "NORMAL" ? t(dict, "normal_mode") : t(dict, "expert_mode");
  const tuning = MODES[mode];
  return (
    <button
      type="button"
      onClick={onPick}
      className="w-full border-2 border-lime-400 bg-black/70 px-4 py-3 text-left shadow-[0_0_16px_rgba(132,204,22,0.35)] hover:bg-lime-950"
    >
      <span className="block text-sm uppercase">{label}</span>
      <span className="mt-1 block text-[9px] text-lime-100/80">
        {(t(dict, "lives") || "Lives").toUpperCase()} {tuning.startingLives} · {(t(dict, "high_score") || "High score").toUpperCase()}{" "}
        {save.highScores[mode]}
      </span>
    </button>
  );
}

function GameScreen({
  dict,
  save,
  ship,
  weapon,
  specialty,
  mode,
  onExit,
}: {
  dict: Record<string, string>;
  save: SaveData;
  ship: number;
  weapon: number;
  specialty: SpecialtyId;
  mode: GameModeId;
  onExit: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const worldRef = useRef<World | null>(null);
  const padRef = useRef<ControlPad | null>(null);
  const [art, setArt] = useState<Art | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ui, setUi] = useState(0);
  const [showControls, setShowControls] = useState(false);
  const [showSound, setShowSound] = useState(false);

  useEffect(() => {
    let dead = false;
    loadArt()
      .then((loaded) => {
        if (dead) return;
        setArt(loaded);
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Asset load failed"));
    return () => {
      dead = true;
    };
  }, []);

  useEffect(() => {
    if (!art || !canvasRef.current) return;
    const canvas = canvasRef.current;
    let stop = () => {};
    let dead = false;
    audio.playMusic("game");
    void document.fonts.ready.then(() => {
      if (dead) return;
      const world = createWorld({
        mode,
        ship,
        weapon,
        specialty,
        save,
        onSave: persistSave,
        onSfx: (name) => audio.play(name),
      });
      worldRef.current = world;
      const pad = createPad(world);
      padRef.current = pad;
      stop = startLoop(canvas, () => worldRef.current ?? world, art, dict, pad, () => setUi((value) => value + 1));
    });
    return () => {
      dead = true;
      stop();
      audio.playMusic("menu");
    };
  }, [art, mode, ship, weapon, specialty, dict, save]);

  const world = worldRef.current;
  const over = world?.gameOver;
  const paused = world?.paused && !over;

  return (
    <div className="flex min-h-dvh items-center justify-center bg-black">
      <div
        className="relative"
        style={{
          width: "min(100vw, calc(100dvh * 550 / 750))",
          height: "min(100dvh, calc(100vw * 750 / 550))",
        }}
      >
        <canvas ref={canvasRef} width={550} height={750} className="h-full w-full touch-none bg-black" />
        {!art && <p className="absolute inset-0 flex items-center justify-center text-[10px] uppercase">{t(dict, "loading")}</p>}
        {error && <p className="absolute inset-x-4 top-4 bg-red-900 p-3 text-[10px]">{error}</p>}
        <button
          type="button"
          className="absolute top-2 right-2 border border-white/40 bg-black/60 px-2 py-1 text-[9px] uppercase"
          onClick={() => {
            if (!worldRef.current || worldRef.current.phase === "over") return;
            worldRef.current.paused = !worldRef.current.paused;
            setUi((value) => value + 1);
          }}
        >
          ESC
        </button>
        <TouchControls padRef={padRef} />
        {paused && (
          <Overlay>
            <h2 className="text-sm uppercase">Pause</h2>
            <ArcadeButton
              label={t(dict, "back")}
              onClick={() => {
                if (worldRef.current) worldRef.current.paused = false;
                setShowControls(false);
                setShowSound(false);
                setUi((value) => value + 1);
              }}
            />
            <ArcadeButton label={t(dict, "controls")} onClick={() => setShowControls((value) => !value)} />
            <ArcadeButton label={t(dict, "sound")} onClick={() => setShowSound((value) => !value)} />
            {showControls && <Controls dict={dict} expert={mode === "EXPERT"} />}
            {showSound && <SoundSliders save={save} dict={dict} />}
            <ArcadeButton label={t(dict, "quit_game")} danger onClick={onExit} />
          </Overlay>
        )}
        {over && (
          <Overlay>
            <h2 className="text-lg text-red-400 uppercase">{(t(dict, "game_over") || "Game over").replace(/[.\s]+$/, "")}</h2>
            <p className="text-center text-[10px]">{t(dict, "new_game")}</p>
            <div className="w-full border-2 border-white/50 bg-black/70 p-4 text-[10px] leading-6">
              <Stat label={t(dict, "score")} value={String(over.finalScore)} />
              <Stat label={t(dict, "high_score")} value={String(over.highScore)} />
              <Stat label={t(dict, "level")} value={String(over.levelReached)} />
              <Stat label={t(dict, "time_played")} value={formatSurvived(over.survivedSeconds)} />
            </div>
            <ArcadeButton
              label={t(dict, "start")}
              onClick={() => {
                const next = createWorld({
                  mode,
                  ship,
                  weapon,
                  specialty,
                  save,
                  onSave: persistSave,
                  onSfx: (name) => audio.play(name),
                });
                worldRef.current = next;
                if (padRef.current) Object.assign(padRef.current, createPad(next));
                setUi((value) => value + 1);
              }}
            />
            <ArcadeButton label={t(dict, "quit_game")} danger onClick={onExit} />
          </Overlay>
        )}
        <span className="sr-only">{ui}</span>
      </div>
    </div>
  );
}

function TouchControls({ padRef }: { padRef: RefObject<ControlPad | null> }) {
  const bind = (key: "up" | "down" | "left" | "right" | "shootHeld") => ({
    onPointerDown: (event: PointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      const pad = padRef.current;
      if (!pad) return;
      pad[key] = true;
      if (key === "shootHeld") pad.queueShoot = true;
    },
    onPointerUp: () => {
      const pad = padRef.current;
      if (pad) pad[key] = false;
    },
    onPointerLeave: () => {
      const pad = padRef.current;
      if (pad) pad[key] = false;
    },
  });
  return (
    <div className="pointer-events-none absolute inset-0 hidden max-[700px]:block">
      <div className="pointer-events-auto absolute bottom-3 left-3 grid grid-cols-3 gap-1">
        <span />
        <Pad label="↑" {...bind("up")} />
        <span />
        <Pad label="←" {...bind("left")} />
        <span />
        <Pad label="→" {...bind("right")} />
        <span />
        <Pad label="↓" {...bind("down")} />
        <span />
      </div>
      <div className="pointer-events-auto absolute right-3 bottom-3 flex flex-col gap-2">
        <Pad label="FIRE" {...bind("shootHeld")} />
        <Pad
          label="B"
          onPointerDown={(event) => {
            event.preventDefault();
            if (padRef.current) padRef.current.queueBomb = true;
          }}
        />
        <Pad
          label="E"
          onPointerDown={(event) => {
            event.preventDefault();
            if (padRef.current) padRef.current.queueShield = true;
          }}
        />
      </div>
    </div>
  );
}

function Pad(props: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  const { label, ...rest } = props;
  return (
    <button type="button" className="h-12 w-12 touch-none border border-lime-300/70 bg-black/50 text-[10px] uppercase" {...rest}>
      {label}
    </button>
  );
}

function Controls({ dict, expert }: { dict: Record<string, string>; expert: boolean }) {
  const rows = [
    ["↑ / W", t(dict, "move_up")],
    ["↓ / S", t(dict, "move_down")],
    ["← / A", t(dict, "move_left")],
    ["→ / D", t(dict, "move_right")],
    [expert ? "SPACE / CLICK" : "SPACE", t(dict, "shoot")],
    ["B", t(dict, "bomb")],
    ["E", t(dict, "shield")],
    ["ESC", t(dict, "pause_game")],
  ];
  return (
    <ul className="w-full text-[9px] leading-5 text-lime-100">
      {rows.map(([key, label]) => (
        <li key={key}>
          {key}: {label}
        </li>
      ))}
    </ul>
  );
}

function SoundSliders({ save, dict }: { save: SaveData; dict: Record<string, string> }) {
  const update = (partial: Partial<SaveData["settings"]>) => {
    save.settings = { ...save.settings, ...partial };
    persistSave(save);
    audio.apply(save.settings);
  };
  return (
    <div className="w-full space-y-2 text-[9px]">
      <label className="block">
        {t(dict, "sound_main")} {Math.round(save.settings.volume * 100)}%
        <input
          className="w-full"
          type="range"
          min={0}
          max={1}
          step={0.05}
          defaultValue={save.settings.volume}
          onChange={(event) => update({ volume: Number(event.target.value) })}
        />
      </label>
      <label className="block">
        {t(dict, "sound_sfx")} {Math.round(save.settings.sfxVolume * 100)}%
        <input
          className="w-full"
          type="range"
          min={0}
          max={1}
          step={0.05}
          defaultValue={save.settings.sfxVolume}
          onChange={(event) => update({ sfxVolume: Number(event.target.value) })}
        />
      </label>
      <label className="flex items-center gap-2">
        <input type="checkbox" defaultChecked={save.settings.muted} onChange={(event) => update({ muted: event.target.checked })} />
        {t(dict, "sound_main")}
      </label>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          defaultChecked={save.settings.sfxMuted}
          onChange={(event) => update({ sfxMuted: event.target.checked })}
        />
        {t(dict, "sound_sfx")}
      </label>
    </div>
  );
}

function Options({
  dict,
  save,
  onChange,
  onBack,
}: {
  dict: Record<string, string>;
  save: SaveData;
  onChange: (settings: SaveData["settings"]) => void;
  onBack: () => void;
}) {
  const settings = save.settings;
  return (
    <Picker title={t(dict, "options")} onBack={onBack} backLabel={t(dict, "back")}>
      <label className="w-full text-[10px]">
        {t(dict, "language")}
        <select
          className="mt-1 w-full border border-lime-300 bg-black p-2"
          value={settings.language}
          onChange={(event) => onChange({ ...settings, language: event.target.value })}
        >
          {LANGUAGES.map((language) => (
            <option key={language.id} value={language.id}>
              {language.native}
            </option>
          ))}
        </select>
      </label>
      <label className="w-full text-[10px]">
        {t(dict, "sound_main")} {Math.round(settings.volume * 100)}%
        <input
          className="w-full"
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={settings.volume}
          onChange={(event) => onChange({ ...settings, volume: Number(event.target.value) })}
        />
      </label>
      <label className="flex items-center gap-2 text-[10px]">
        <input
          type="checkbox"
          checked={settings.muted}
          onChange={(event) => onChange({ ...settings, muted: event.target.checked })}
        />
        {t(dict, "sound_main")}
      </label>
      <label className="w-full text-[10px]">
        {t(dict, "sound_sfx")} {Math.round(settings.sfxVolume * 100)}%
        <input
          className="w-full"
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={settings.sfxVolume}
          onChange={(event) => onChange({ ...settings, sfxVolume: Number(event.target.value) })}
        />
      </label>
      <label className="flex items-center gap-2 text-[10px]">
        <input
          type="checkbox"
          checked={settings.sfxMuted}
          onChange={(event) => onChange({ ...settings, sfxMuted: event.target.checked })}
        />
        {t(dict, "sound_sfx")}
      </label>
    </Picker>
  );
}

function Achievements({ dict, save, onBack }: { dict: Record<string, string>; save: SaveData; onBack: () => void }) {
  const defs = useMemo(() => save.achievements, [save.achievements]);
  return (
    <Picker title={t(dict, "achievements")} onBack={onBack} backLabel={t(dict, "back")}>
      <p className="text-center text-[9px] text-white/70">{t(dict, "achievements_subtitle")}</p>
      <div className="max-h-[50dvh] w-full space-y-2 overflow-y-auto pr-1">
        {defs.map((progress) => {
          const def = SPECIALTY_ACH(progress.id);
          if (!def) return null;
          return (
            <div key={progress.id} className={`border p-2 text-[9px] ${progress.completed ? "border-yellow-300" : "border-white/20"}`}>
              <p>{achievementLabel(dict, def)}</p>
              <p className="text-white/60">
                {t(dict, "achievement_reward")}: {def.reward} {t(dict, "achievement_reward_coins")}
              </p>
            </div>
          );
        })}
      </div>
    </Picker>
  );
}

const ACH_LOOKUP = Object.fromEntries(ACHIEVEMENTS.map((item) => [item.id, item]));

function SPECIALTY_ACH(id: string) {
  return ACH_LOOKUP[id];
}

function achievementLabel(dict: Record<string, string>, def: (typeof ACHIEVEMENTS)[number]) {
  return achievementText(dict, def);
}

function Overlay({ children }: { children: ReactNode }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 p-6">{children}</div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <p>
      {label.toUpperCase()}: {value}
    </p>
  );
}

function Picker({
  title,
  onBack,
  backLabel,
  children,
}: {
  title: string;
  onBack: () => void;
  backLabel: string;
  children: ReactNode;
}) {
  return (
    <div className="flex w-full max-w-md flex-col items-center gap-4">
      <h2 className="text-center text-sm uppercase">{title}</h2>
      {children}
      <ArcadeButton label={backLabel} onClick={onBack} />
    </div>
  );
}

function SelectTile({
  src,
  selected,
  locked,
  onClick,
}: {
  src: string;
  selected: boolean;
  locked: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex h-20 items-center justify-center border-2 bg-black/60 p-2 ${
        selected ? "border-lime-300" : "border-white/20"
      }`}
    >
      <img src={src} alt="" className="max-h-16 max-w-full object-contain" />
      {locked && <img src={asset("assets/textures/lock.png")} alt="" className="absolute top-1 right-1 h-4 w-4" />}
    </button>
  );
}

function ArcadeButton({ label, onClick, danger = false }: { label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full max-w-sm border-2 px-4 py-3 text-xs uppercase ${
        danger
          ? "border-red-500 bg-red-950/80 shadow-[0_0_16px_rgba(239,68,68,0.45)]"
          : "border-lime-400 bg-black/70 shadow-[0_0_16px_rgba(132,204,22,0.35)] hover:bg-lime-950"
      }`}
    >
      {label}
    </button>
  );
}

function Notice({ text, ok, onClose }: { text: string; ok: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/70 p-6">
      <div className="w-full max-w-sm border-2 border-lime-300 bg-black p-5">
        <p className="text-[11px] leading-6 whitespace-pre-line">{text}</p>
        <button type="button" className="mt-4 w-full border border-lime-300 py-2 text-xs uppercase" onClick={onClose}>
          {ok}
        </button>
      </div>
    </div>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden">
      <img
        src={asset("assets/textures/background.png")}
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-50"
      />
      <div className="relative z-10 flex w-full max-w-[560px] flex-col items-center gap-5 px-4 py-8">{children}</div>
    </div>
  );
}
