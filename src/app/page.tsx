"use client";

import { useState, useRef, useCallback, useEffect, forwardRef } from "react";
import { toJpeg } from "html-to-image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import BackgroundLayer from "@/components/BackgroundLayer";
import { 
  Bold, Italic, Copy, Save, FileText, ImagePlus, Trash2, 
  Download, Eye, RefreshCw, Plus, Minus, ChevronDown, ChevronUp,
  Smartphone, MessageSquare, Send, Archive, History, X, Check,
  ImageIcon, Layers, Share2, Palette, Type,
  Strikethrough, Code, MapPin, Map as MapIcon, Loader2, Move, ZoomIn, ZoomOut
} from "lucide-react";
import { toast } from "sonner";
import layoutConfig from "@/config/layout-config.json";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Types
interface PesertaItem {
  id: string;
  text: string;
}

interface PelaksanaanItem {
  id: string;
  text: string;
  subItems: string[];
}

interface Draft {
  id: string;
  judul: string;
  tempat: string;
  tanggal: string;
  waktu: string;
  pimpinan: string;
  peserta: PesertaItem[];
  pelaksanaan: PelaksanaanItem[];
  createdAt: string;
  updatedAt: string;
}

interface FotoItem {
  id: string;
  file: File | null;
  preview: string;
  cachedImage: HTMLImageElement | null;  // Cache for fast merge
}

// Generate unique ID
const generateId = () => Math.random().toString(36).substr(2, 9);

// Format today's date in Indonesian format: "Hari, DD Bulan Tahun"
const formatTodayDate = (): string => {
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
                  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  
  const today = new Date();
  const dayName = days[today.getDay()];
  const date = today.getDate();
  const monthName = months[today.getMonth()];
  const year = today.getFullYear();
  
  return `${dayName}, ${date} ${monthName} ${year}`;
};

// Helper function to shade colors
const shadeColor = (color: string, percent: number): string => {
  const num = parseInt(color.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;
  return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 + (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 + (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
};

// Helper function to draw diamond shape
const drawDiamond = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.PI / 4);
  ctx.fillRect(-size / 2, -size / 2, size, size);
  ctx.restore();
};

// Google Maps API Key
const GOOGLE_MAPS_API_KEY = "AIzaSyBrCtNSFRRuPOhfg9I_7cCVNwHvaBtBV60";

// Location Data Interface
interface LocationData {
  placeName: string;
  address: string;
  lat: number | null;
  lng: number | null;
  mapImageUrl: string;
}

// Map Location Picker Component
interface MapLocationPickerProps {
  value: string;
  onChange: (value: string) => void;
  onLocationChange?: (location: LocationData) => void;
  placeholder?: string;
}

declare global {
  interface Window {
    google: typeof google;
    initMapCallback: () => void;
  }
}

const MapLocationPicker = ({ value, onChange, onLocationChange, placeholder }: MapLocationPickerProps) => {
  // =============================
  // STATE
  // =============================
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const [address, setAddress] = useState("");
  const [markerPosition, setMarkerPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listenersRef = useRef<google.maps.MapsEventListener[]>([]);

  // Generate static map image URL
  const generateMapImageUrl = useCallback((lat: number, lng: number) => {
    return `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=16&size=400x300&markers=color:red%7C${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`;
  }, []);

  // =============================
  // REVERSE GEOCODE
  // =============================
  const reverseGeocode = useCallback((lat: number, lng: number) => {
    if (!window.google?.maps) return;

    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      setIsLoadingAddress(false);
      
      if (status === "OK" && results?.[0]) {
        const formattedAddress = results[0].formatted_address;
        setAddress(formattedAddress);
        console.log("[Geocode]", formattedAddress);
      }
    });
  }, []);

  // =============================
  // SEARCH AUTOCOMPLETE
  // =============================
  const handleSearch = useCallback((value: string) => {
    if (searchInputRef.current) {
      searchInputRef.current.value = value;
    }
    
    if (!value || !autocompleteServiceRef.current) {
      setPredictions([]);
      return;
    }

    autocompleteServiceRef.current.getPlacePredictions(
      {
        input: value,
        componentRestrictions: { country: "id" }
      },
      (results, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
          setPredictions(results);
        } else {
          setPredictions([]);
        }
      }
    );
  }, []);

  // =============================
  // SELECT SEARCH RESULT
  // =============================
  const selectPlace = useCallback((placeId: string) => {
    if (!placesServiceRef.current) return;

    setIsLoadingAddress(true);
    setPredictions([]);

    placesServiceRef.current.getDetails(
      {
        placeId,
        fields: ["name", "geometry", "formatted_address"]
      },
      (place, status) => {
        if (status !== window.google.maps.places.PlacesServiceStatus.OK || !place?.geometry?.location) {
          setIsLoadingAddress(false);
          return;
        }

        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();

        mapInstanceRef.current?.setCenter({ lat, lng });
        mapInstanceRef.current?.setZoom(17);

        const formattedAddress = place.formatted_address || "";
        setAddress(formattedAddress);
        setIsLoadingAddress(false);

        if (searchInputRef.current) {
          searchInputRef.current.value = formattedAddress;
        }

        console.log("[SelectPlace]", formattedAddress, lat, lng);
      }
    );
  }, []);

  // =============================
  // USER LOCATION
  // =============================
  const useMyLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error("Browser tidak mendukung geolokasi");
      return;
    }

    setIsLoadingAddress(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        mapInstanceRef.current?.setCenter({ lat, lng });
        mapInstanceRef.current?.setZoom(17);

        reverseGeocode(lat, lng);
      },
      (error) => {
        console.error("GPS error:", error);
        setIsLoadingAddress(false);
        toast.error("Gagal mendapatkan lokasi");
      }
    );
  }, [reverseGeocode]);

  // =============================
  // LOAD MAP
  // =============================
  const initMap = useCallback(async () => {
    if (!mapRef.current) return;

    setIsLoading(true);

    // Load Google Maps script if needed
    if (!window.google?.maps) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&callback=initMapCallback`;
        script.async = true;
        script.defer = true;
        window.initMapCallback = () => resolve();
        script.onerror = () => reject(new Error("Failed to load Google Maps"));
        document.head.appendChild(script);
      });
    }

    if (!mapRef.current) return;

    const defaultLocation = { lat: -6.2088, lng: 106.8456 };

    // Create map
    mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
      center: defaultLocation,
      zoom: 15,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      clickableIcons: false,
    });

    // Create places service
    placesServiceRef.current = new window.google.maps.places.PlacesService(mapInstanceRef.current);
    autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService();

    // Center marker (fixed)
    const centerMarker = document.createElement("div");
    centerMarker.id = "center-marker";
    centerMarker.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -100%);
      pointer-events: none;
      font-size: 32px;
      z-index: 100;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
    `;
    centerMarker.innerHTML = "📍";
    mapRef.current.appendChild(centerMarker);

    // Drag start - show loading
    const dragListener = mapInstanceRef.current.addListener("dragstart", () => {
      setIsLoadingAddress(true);
    });
    listenersRef.current.push(dragListener);

    // Idle - reverse geocode
    const idleListener = mapInstanceRef.current.addListener("idle", () => {
      const center = mapInstanceRef.current?.getCenter();
      if (!center) {
        setIsLoadingAddress(false);
        return;
      }

      const lat = center.lat();
      const lng = center.lng();

      setMarkerPosition({ lat, lng });
      reverseGeocode(lat, lng);
    });
    listenersRef.current.push(idleListener);

    setMarkerPosition(defaultLocation);
    reverseGeocode(defaultLocation.lat, defaultLocation.lng);
    setIsLoading(false);
  }, [reverseGeocode]);

  // =============================
  // CONFIRM LOCATION
  // =============================
  const confirmLocation = useCallback(() => {
    const center = mapInstanceRef.current?.getCenter();
    if (!center || !address) {
      toast.error("Pilih lokasi terlebih dahulu");
      return;
    }

    const lat = center.lat();
    const lng = center.lng();

    const locationData: LocationData = {
      placeName: address.split(",")[0],
      address,
      lat,
      lng,
      mapImageUrl: generateMapImageUrl(lat, lng)
    };

    onChange(address);
    onLocationChange?.(locationData);

    console.log("[Confirm]", { address, lat, lng });
    setIsOpen(false);
  }, [address, onChange, onLocationChange, generateMapImageUrl]);

  // =============================
  // DIALOG HANDLERS
  // =============================
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    
    if (open) {
      setAddress("");
      setPredictions([]);
      setTimeout(() => initMap(), 100);
    } else {
      // Cleanup
      listenersRef.current.forEach(l => google.maps.event.removeListener(l));
      listenersRef.current = [];
      document.getElementById("center-marker")?.remove();
      mapInstanceRef.current = null;
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          searchInputRef.current && !searchInputRef.current.contains(e.target as Node)) {
        setPredictions([]);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="bg-slate-900/50 border-white/10 text-white placeholder:text-slate-500 focus:border-red-500 pr-10"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => handleOpenChange(true)}
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-slate-400 hover:text-white hover:bg-white/10"
          >
            <MapPin className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] bg-slate-800 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <MapIcon className="w-5 h-5 text-red-500" />
              Pilih Lokasi
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Geser peta atau cari lokasi
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Search */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  ref={searchInputRef}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Cari lokasi..."
                  className="w-full bg-slate-900/50 border-white/10 text-white placeholder:text-slate-500"
                />
                {predictions.length > 0 && (
                  <div
                    ref={dropdownRef}
                    className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-white/10 rounded-lg shadow-xl z-[9999] max-h-60 overflow-y-auto"
                  >
                    {predictions.map((p) => (
                      <button
                        key={p.place_id}
                        type="button"
                        onClick={() => selectPlace(p.place_id)}
                        className="w-full px-4 py-3 text-left hover:bg-slate-700/50 border-b border-white/5 last:border-b-0"
                      >
                        <div className="text-sm text-white font-medium">
                          {p.structured_formatting?.main_text || p.description}
                        </div>
                        {p.structured_formatting?.secondary_text && (
                          <div className="text-xs text-slate-400 mt-0.5">
                            {p.structured_formatting.secondary_text}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Button
                onClick={useMyLocation}
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-500 text-white"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <MapPin className="w-4 h-4" />
                )}
              </Button>
            </div>

            {/* Map */}
            <div
              ref={mapRef}
              className="w-full h-[400px] rounded-lg border border-white/10 bg-slate-900"
            />

            {/* Address display */}
            <div className="text-sm bg-slate-900/50 p-3 rounded-lg min-h-[50px]">
              {isLoadingAddress ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
                  <span className="text-slate-400">Mencari alamat...</span>
                </div>
              ) : address ? (
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <span className="text-white">{address}</span>
                </div>
              ) : markerPosition ? (
                <div className="flex items-center gap-2 text-slate-400">
                  <MapPin className="w-4 h-4" />
                  <span>{markerPosition.lat.toFixed(6)}, {markerPosition.lng.toFixed(6)}</span>
                </div>
              ) : null}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => handleOpenChange(false)}
              className="border-white/20 bg-white/5 hover:bg-white/10 text-white"
            >
              Batal
            </Button>
            <Button
              onClick={confirmLocation}
              disabled={!address}
              className="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white disabled:opacity-50"
            >
              <Check className="w-4 h-4 mr-2" />
              Pilih Lokasi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Template default untuk laporan Basarnas
const DEFAULT_TEMPLATE = {
  greeting: "Assalamualaikum Warahmatullahi Wabarakatuh",
  yth: "Direktur Kesiapsiagaan",
  ccList: [
    "Kasubdit Siaga dan Latihan",
    "Pejabat Fungsional Ahli Madya, Muda, dan Pratama",
    "Pejabat Pelaksana, Seniors serta Rekans Direktorat Kesiapsiagaan"
  ]
};

// Helper to insert WhatsApp formatting - MUST be defined before components that use it
const insertWAFormat = (
  text: string,
  selectionStart: number,
  selectionEnd: number,
  format: 'bold' | 'italic' | 'strike' | 'mono'
): { newText: string; newCursorPos: number } => {
  const selectedText = text.substring(selectionStart, selectionEnd);
  // Use double markers for editor (will be converted for WhatsApp)
  const markers: Record<string, { start: string; end: string }> = {
    bold: { start: '**', end: '**' },       // Editor: **text** → WhatsApp: *text*
    italic: { start: '__', end: '__' },     // Editor: __text__ → WhatsApp: _text_
    strike: { start: '~~', end: '~~' },     // Editor: ~~text~~ → WhatsApp: ~text~
    mono: { start: '```', end: '```' }      // Editor & WhatsApp: ```text```
  };
  
  const { start, end } = markers[format];
  
  if (selectedText) {
    // Check if already formatted
    if (text.substring(selectionStart - start.length, selectionStart) === start &&
        text.substring(selectionEnd, selectionEnd + end.length) === end) {
      // Remove formatting
      const newText = text.substring(0, selectionStart - start.length) + 
                      selectedText + 
                      text.substring(selectionEnd + end.length);
      return { newText, newCursorPos: selectionStart - start.length + selectedText.length };
    } else {
      // Add formatting
      const newText = text.substring(0, selectionStart) + 
                      start + selectedText + end + 
                      text.substring(selectionEnd);
      return { newText, newCursorPos: selectionStart + start.length + selectedText.length + end.length };
    }
  } else {
    // No selection, insert markers at cursor
    const newText = text.substring(0, selectionStart) + start + end + text.substring(selectionStart);
    return { newText, newCursorPos: selectionStart + start.length };
  }
};

// Compact toolbar button
const ToolbarButton = ({ onClick, icon: Icon, title }: { onClick: () => void; icon: React.ElementType; title: string }) => (
  <button
    type="button"
    onClick={onClick}
    className="w-5 h-5 flex items-center justify-center rounded text-slate-400 hover:text-white hover:bg-white/15 transition-colors"
    title={title}
  >
    <Icon className="w-3 h-3" />
  </button>
);

// Input with integrated toolbar
interface WAInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
}

const WAInput = ({ value, onChange, placeholder, className = "", id }: WAInputProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const [isFocused, setIsFocused] = useState(false);

  const handleFormat = (format: 'bold' | 'italic' | 'strike' | 'mono') => {
    if (!inputRef.current) return;
    const { newText, newCursorPos } = insertWAFormat(value, selection.start, selection.end, format);
    onChange(newText);
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  const updateSelection = () => {
    if (inputRef.current) {
      setSelection({
        start: inputRef.current.selectionStart || 0,
        end: inputRef.current.selectionEnd || 0
      });
    }
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onSelect={updateSelection}
        onClick={updateSelection}
        onKeyUp={updateSelection}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        className={`w-full bg-slate-900/50 border border-white/10 text-white placeholder:text-slate-500 focus:border-red-500 focus:outline-none rounded-md py-2 pl-3 pr-24 ${className}`}
      />
      <div className={`absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5 px-1 py-0.5 rounded bg-slate-800/80 border border-slate-700/50 transition-opacity ${isFocused ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`}>
        <ToolbarButton onClick={() => handleFormat('bold')} icon={Bold} title="Bold (*teks*)" />
        <ToolbarButton onClick={() => handleFormat('italic')} icon={Italic} title="Italic (_teks_)" />
        <ToolbarButton onClick={() => handleFormat('strike')} icon={Strikethrough} title="Strikethrough (~teks~)" />
        <ToolbarButton onClick={() => handleFormat('mono')} icon={Code} title="Monospace (```teks```)" />
      </div>
    </div>
  );
};

// Textarea with integrated toolbar
interface WATextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  rows?: number;
}

const WATextarea = ({ value, onChange, placeholder, className = "", id, rows = 2 }: WATextareaProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const [isFocused, setIsFocused] = useState(false);

  const handleFormat = (format: 'bold' | 'italic' | 'strike' | 'mono') => {
    if (!textareaRef.current) return;
    const { newText, newCursorPos } = insertWAFormat(value, selection.start, selection.end, format);
    onChange(newText);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  const updateSelection = () => {
    if (textareaRef.current) {
      setSelection({
        start: textareaRef.current.selectionStart || 0,
        end: textareaRef.current.selectionEnd || 0
      });
    }
  };

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onSelect={updateSelection}
        onClick={updateSelection}
        onKeyUp={updateSelection}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        rows={rows}
        className={`w-full resize-none bg-slate-900/50 border border-white/10 text-white placeholder:text-slate-500 focus:border-red-500 focus:outline-none rounded-md py-2 pl-3 pr-24 ${className}`}
      />
      <div className={`absolute right-1.5 top-2 flex items-center gap-0.5 px-1 py-0.5 rounded bg-slate-800/80 border border-slate-700/50 transition-opacity ${isFocused ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`}>
        <ToolbarButton onClick={() => handleFormat('bold')} icon={Bold} title="Bold (*teks*)" />
        <ToolbarButton onClick={() => handleFormat('italic')} icon={Italic} title="Italic (_teks_)" />
        <ToolbarButton onClick={() => handleFormat('strike')} icon={Strikethrough} title="Strikethrough (~teks~)" />
        <ToolbarButton onClick={() => handleFormat('mono')} icon={Code} title="Monospace (```teks```)" />
      </div>
    </div>
  );
};

// Render formatted text segment (bold, italic, etc.)
const renderFormattedText = (text: string): React.ReactNode[] => {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;
  
  while (remaining.length > 0) {
    // Match bold *text* or **text**
    const boldMatch = remaining.match(/^\*\*([^*]+)\*\*/) || remaining.match(/^\*([^*]+)\*/);
    // Match italic _text_ or __text__
    const italicMatch = remaining.match(/^__([^_]+)__/) || remaining.match(/^_([^_]+)_/);
    // Match strikethrough ~text~ or ~~text~~
    const strikeMatch = remaining.match(/^~~([^~]+)~~/) || remaining.match(/^~([^~]+)~/);
    // Match monospace ```text```
    const monoMatch = remaining.match(/^```([^`]+)```/);
    
    if (monoMatch) {
      parts.push(<code key={key++} className="bg-slate-200 dark:bg-slate-700 px-1 rounded font-mono text-sm">{monoMatch[1]}</code>);
      remaining = remaining.slice(monoMatch[0].length);
    } else if (boldMatch) {
      parts.push(<strong key={key++}>{boldMatch[1]}</strong>);
      remaining = remaining.slice(boldMatch[0].length);
    } else if (italicMatch) {
      parts.push(<em key={key++}>{italicMatch[1]}</em>);
      remaining = remaining.slice(italicMatch[0].length);
    } else if (strikeMatch) {
      parts.push(<del key={key++}>{strikeMatch[1]}</del>);
      remaining = remaining.slice(strikeMatch[0].length);
    } else {
      // Find next formatting or take rest of text
      const nextBold = remaining.indexOf('*');
      const nextItalic = remaining.indexOf('_');
      const nextStrike = remaining.indexOf('~');
      const nextMono = remaining.indexOf('```');
      
      let nextFormat = -1;
      const positions = [nextBold, nextItalic, nextStrike, nextMono].filter(p => p >= 0);
      if (positions.length > 0) {
        nextFormat = Math.min(...positions);
      }
      
      if (nextFormat > 0) {
        parts.push(<span key={key++}>{remaining.slice(0, nextFormat)}</span>);
        remaining = remaining.slice(nextFormat);
      } else if (nextFormat === 0) {
        parts.push(<span key={key++}>{remaining[0]}</span>);
        remaining = remaining.slice(1);
      } else {
        parts.push(<span key={key++}>{remaining}</span>);
        break;
      }
    }
  }
  
  return parts;
};

// Render WhatsApp text with proper hanging indent for numbered items and sub-items
const renderWhatsAppText = (text: string): React.ReactNode => {
  const lines = text.split('\n');
  
  return (
    <div className="space-y-0.5">
      {lines.map((line, lineIndex) => {
        // Check for numbered item: "1. text" or "2. text" etc.
        const numberedMatch = line.match(/^(\d+\.)\s(.*)$/);
        // Check for sub-item: "    - text" (spaces + dash)
        const subItemMatch = line.match(/^(\s*)(-)\s(.*)$/);
        // Check for regular dash item: "- text"
        const dashMatch = line.match(/^(-)\s(.*)$/);
        
        if (numberedMatch) {
          // Numbered item with hanging indent
          return (
            <div key={lineIndex} className="flex gap-1">
              <span className="flex-shrink-0 w-5 text-right font-medium">{numberedMatch[1]}</span>
              <span className="flex-1">{renderFormattedText(numberedMatch[2])}</span>
            </div>
          );
        } else if (subItemMatch) {
          // Sub-item with hanging indent (indented from parent)
          return (
            <div key={lineIndex} className="flex gap-1 pl-6">
              <span className="flex-shrink-0 w-3">{subItemMatch[2]}</span>
              <span className="flex-1">{renderFormattedText(subItemMatch[3])}</span>
            </div>
          );
        } else if (dashMatch) {
          // Regular dash item with hanging indent
          return (
            <div key={lineIndex} className="flex gap-1">
              <span className="flex-shrink-0 w-3">{dashMatch[1]}</span>
              <span className="flex-1">{renderFormattedText(dashMatch[2])}</span>
            </div>
          );
        } else {
          // Regular line
          return <div key={lineIndex}>{renderFormattedText(line)}</div>;
        }
      })}
    </div>
  );
};

// Layer types for Collage Editor - Simplified with percentage positioning
interface PhotoLayer {
  id: string;
  url: string;
  frameX: string;  // percentage e.g. "5%"
  frameY: string;  // percentage e.g. "28%"
  frameW: string;  // percentage e.g. "40%"
  frameH: string;  // percentage e.g. "25%"
  imgX: number;    // pixel offset for panning (percentage)
  imgY: number;    // pixel offset for panning (percentage)
  scale: number;   // zoom scale
}

interface CollageLayers {
  background: {
    url: string | null;
    scale: number;
    x: number;
    y: number;
  };
  title: {
    text: string;
    x: number;
    y: number;
    fontSize: number;
    color: string;
  };
  subtitle: {
    text: string;
    x: number;
    y: number;
    fontSize: number;
    color: string;
  };
  footer: {
    text: string;
    x: number;
    y: number;
    fontSize: number;
    color: string;
  };
  logo: {
    leftX: number;   // percentage position
    leftY: number;   // percentage position
    rightX: number;  // percentage position
    rightY: number;  // percentage position
    size: number;    // logo size in pixels
  };
  photos: PhotoLayer[];
}

// Collage Editor Props
interface CollageEditorProps {
  layers: CollageLayers;
  setLayers: React.Dispatch<React.SetStateAction<CollageLayers>>;
  selected: string | null;
  setSelected: (s: string | null) => void;
  canvasWidth: number;
  canvasHeight: number;
  backgroundBrightness: "light" | "dark";
  onBackgroundUpload: (file: File) => void;
  onPhotoUpload: (files: FileList) => void;
  onMerge: () => void;
  onDownload: () => void;
  isMerging: boolean;
  setIsMerging: (value: boolean) => void;
  mergedImage: string;
  setMergedImage: (img: string) => void;
  basarnasLogo: HTMLImageElement | null;
  bppLogo: HTMLImageElement | null;
  reportTitle: string;
  reportSubtitle: string;
  onSendToWhatsApp: () => void;
  // WhatsApp photo sending states
  showSendPhotoButton: boolean;
  isSendingWA: boolean;
  onSendPhoto: () => void;
  onClosePreview: () => void;
}

// Collage Editor Component - Mobile Style Layout with Bottom Toolbar
const CollageEditor = ({
  layers,
  setLayers,
  selected,
  setSelected,
  canvasWidth,
  canvasHeight,
  backgroundBrightness,
  onBackgroundUpload,
  onPhotoUpload,
  onMerge,
  onDownload,
  isMerging,
  setIsMerging,
  mergedImage,
  setMergedImage,
  basarnasLogo,
  bppLogo,
  reportTitle,
  reportSubtitle,
  onSendToWhatsApp,
  showSendPhotoButton,
  isSendingWA,
  onSendPhoto,
  onClosePreview,
}: CollageEditorProps) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const backgroundInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<number | null>(null);

  // =============================
  // GRID SNAP SYSTEM
  // =============================
  const GRID = 5; // Grid size in percentage points
  
  const snapToGrid = useCallback((value: number): number => {
    return Math.round(value / GRID) * GRID;
  }, []);

  // =============================
  // TOUCH GESTURE SYSTEM
  // =============================
  const gestureRef = useRef({
    startX: 0,
    startY: 0,
    startDistance: 0,
    startScale: 1,
    startImgX: 0,
    startImgY: 0,
    photoIndex: null as number | null,
    mode: null as "drag" | "zoom" | null
  });

  // Calculate distance between two touch points
  const getTouchDistance = (t1: React.Touch, t2: React.Touch): number => {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  // Touch start handler
  const handleTouchStart = (e: React.TouchEvent, index: number) => {
    const touches = e.touches;
    const photo = layers.photos[index];
    if (!photo) return;

    gestureRef.current.photoIndex = index;

    if (touches.length === 1) {
      // Single touch - drag mode
      gestureRef.current.mode = "drag";
      gestureRef.current.startX = touches[0].clientX;
      gestureRef.current.startY = touches[0].clientY;
      gestureRef.current.startImgX = photo.imgX;
      gestureRef.current.startImgY = photo.imgY;
    }

    if (touches.length === 2) {
      // Two touches - zoom mode
      gestureRef.current.mode = "zoom";
      gestureRef.current.startDistance = getTouchDistance(touches[0], touches[1]);
      gestureRef.current.startScale = photo.scale;
    }
  };

  // Touch move handler
  const handleTouchMove = (e: React.TouchEvent) => {
    const g = gestureRef.current;
    if (g.photoIndex === null) return;

    e.preventDefault();

    if (g.mode === "drag" && e.touches.length === 1) {
      const dx = e.touches[0].clientX - g.startX;
      const dy = e.touches[0].clientY - g.startY;

      // Convert pixel movement to percentage
      const scaledDx = dx * 0.1;
      const scaledDy = dy * 0.1;

      // Snap to grid
      const newX = snapToGrid(g.startImgX + scaledDx);
      const newY = snapToGrid(g.startImgY + scaledDy);

      updatePhoto(g.photoIndex, {
        imgX: newX,
        imgY: newY
      });
    }

    if (g.mode === "zoom" && e.touches.length === 2) {
      const newDistance = getTouchDistance(e.touches[0], e.touches[1]);
      const ratio = newDistance / g.startDistance;

      updatePhoto(g.photoIndex, {
        scale: Math.min(3, Math.max(0.5, g.startScale * ratio))
      });
    }
  };

  // Touch end handler
  const handleTouchEnd = () => {
    gestureRef.current.mode = null;
    gestureRef.current.photoIndex = null;
  };

  // Update layer helper
  const updateLayer = <K extends keyof CollageLayers>(
    key: K,
    updates: Partial<CollageLayers[K]>
  ) => {
    setLayers((prev) => ({
      ...prev,
      [key]: { ...prev[key], ...updates },
    }));
  };

  // Update photo helper
  const updatePhoto = useCallback((index: number, updates: Partial<PhotoLayer>) => {
    setLayers((prev) => {
      const newPhotos = [...prev.photos];
      newPhotos[index] = { ...newPhotos[index], ...updates };
      return { ...prev, photos: newPhotos };
    });
  }, [setLayers]);

  // Custom drag handler for text elements with grid snap
  const handleElementDrag = useCallback((
    type: 'title' | 'subtitle' | 'footer',
    e: React.MouseEvent | React.TouchEvent
  ) => {
    e.preventDefault();
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    const getClientPos = (e: React.MouseEvent | React.TouchEvent) => {
      if ('touches' in e) {
        return { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
      return { x: e.clientX, y: e.clientY };
    };
    
    const startPos = getClientPos(e);
    const startLayer = layers[type];
    
    const handleMove = (moveEvent: MouseEvent | TouchEvent) => {
      moveEvent.preventDefault();
      const clientX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX;
      const clientY = 'touches' in moveEvent ? moveEvent.touches[0].clientY : moveEvent.clientY;
      
      const deltaX = clientX - startPos.x;
      const deltaY = clientY - startPos.y;
      
      // Convert pixel delta to percentage and snap to grid
      const percentX = Math.round((deltaX / rect.width) * 100);
      const percentY = Math.round((deltaY / rect.height) * 100);
      
      // Snap to grid and clamp values
      const newX = Math.max(0, Math.min(100, snapToGrid(startLayer.x + percentX)));
      const newY = Math.max(0, Math.min(100, snapToGrid(startLayer.y + percentY)));
      
      updateLayer(type, { x: newX, y: newY });
    };
    
    const handleUp = () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
      document.removeEventListener('touchmove', handleMove, { capture: true } as AddEventListenerOptions);
      document.removeEventListener('touchend', handleUp);
    };
    
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
    document.addEventListener('touchmove', handleMove, { passive: false, capture: true } as AddEventListenerOptions);
    document.addEventListener('touchend', handleUp);
  }, [layers, updateLayer, snapToGrid]);

  // Drag handler for logos - FREE DRAG (no grid snap)
  const handleLogoDrag = useCallback((
    logoType: 'left' | 'right',
    e: React.MouseEvent | React.TouchEvent
  ) => {
    e.preventDefault();
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    const getClientPos = (e: React.MouseEvent | React.TouchEvent) => {
      if ('touches' in e) {
        return { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
      return { x: e.clientX, y: e.clientY };
    };
    
    const startPos = getClientPos(e);
    const startX = logoType === 'left' ? layers.logo.leftX : layers.logo.rightX;
    const startY = logoType === 'left' ? layers.logo.leftY : layers.logo.rightY;
    
    const handleMove = (moveEvent: MouseEvent | TouchEvent) => {
      moveEvent.preventDefault();
      const clientX = 'touches' in moveEvent ? moveEvent.touches[0].clientX : moveEvent.clientX;
      const clientY = 'touches' in moveEvent ? moveEvent.touches[0].clientY : moveEvent.clientY;
      
      const deltaX = clientX - startPos.x;
      const deltaY = clientY - startPos.y;
      
      // Convert pixel delta to percentage (no grid snap)
      const percentX = (deltaX / rect.width) * 100;
      const percentY = (deltaY / rect.height) * 100;
      
      // Clamp values (no snapping)
      const newX = Math.max(0, Math.min(100, startX + percentX));
      const newY = Math.max(0, Math.min(100, startY + percentY));
      
      if (logoType === 'left') {
        setLayers(prev => ({
          ...prev,
          logo: { ...prev.logo, leftX: newX, leftY: newY }
        }));
      } else {
        setLayers(prev => ({
          ...prev,
          logo: { ...prev.logo, rightX: newX, rightY: newY }
        }));
      }
    };
    
    const handleUp = () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
      document.removeEventListener('touchmove', handleMove, { capture: true } as AddEventListenerOptions);
      document.removeEventListener('touchend', handleUp);
    };
    
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
    document.addEventListener('touchmove', handleMove, { passive: false, capture: true } as AddEventListenerOptions);
    document.addEventListener('touchend', handleUp);
  }, [layers.logo, setLayers]);

  // =============================
  // EXPORT IMAGE
  // Using html-to-image (no color function errors!)
  // =============================
  const exportImage = async () => {
    if (!canvasRef.current) return;

    setIsMerging(true);

    try {
      await document.fonts.ready;

      const dataUrl = await toJpeg(canvasRef.current, {
        quality: 0.95,
        pixelRatio: 3,   // HD export
        cacheBust: true,
        backgroundColor: "#0f172a"
      });

      setMergedImage(dataUrl);

      toast.success("Foto berhasil di-export!");

    } catch (error) {
      console.error(error);
      toast.error("Gagal export");
    } finally {
      setIsMerging(false);
    }
  };

  const isDarkBg = backgroundBrightness === "dark";
  const textColor = isDarkBg ? "#FFFFFF" : "#1E293B";
  const subtitleColor = isDarkBg ? "#CBD5E1" : "#64748B";

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-[#0e2238] to-[#081624]">
      {/* Hidden inputs */}
      <input
        ref={backgroundInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onBackgroundUpload(file);
        }}
      />
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = e.target.files;
          if (files) onPhotoUpload(files);
        }}
      />

      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-3.5 overflow-auto">
        {/* Canvas - 9:16 aspect ratio with enhanced styling */}
        <div
          ref={canvasRef}
          className="relative overflow-hidden select-none rounded-2xl"
          style={{
            width: "100%",
            maxWidth: "420px",
            aspectRatio: "9 / 16",
            touchAction: "none",
            background: "linear-gradient(180deg, #173a5e 0%, #0b2035 100%)",
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.05), 0 20px 40px rgba(0,0,0,0.6)"
          }}
        >
          {/* Background */}
          {layers.background.url ? (
            <BackgroundLayer
              src={layers.background.url}
              initialScale={layers.background.scale}
              initialPosition={{ x: layers.background.x, y: layers.background.y }}
              onScaleChange={(newScale) => updateLayer("background", { scale: newScale })}
              onPositionChange={(newPos) => updateLayer("background", { x: newPos.x, y: newPos.y })}
            />
          ) : (
            <div 
              className="absolute inset-0"
              style={{
                background: "linear-gradient(180deg, #1e3a5f 0%, #0f172a 50%, #1e293b 100%)",
              }}
            />
          )}

          {/* Grid Guide Overlay */}
          <div
            className="absolute inset-0 pointer-events-none z-50"
            style={{
              backgroundImage: `
                linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)
              `,
              backgroundSize: `${GRID}% ${GRID}%`
            }}
          />

          {/* Center Guide (Vertical Line) */}
          <div
            className="absolute pointer-events-none z-50"
            style={{
              left: "50%",
              top: 0,
              bottom: 0,
              width: "1px",
              background: "rgba(255,255,255,0.3)"
            }}
          />

          {/* Logos - Draggable with yellow glow */}
          {/* Left Logo (Basarnas) */}
          <div 
            className="absolute flex items-center justify-center overflow-visible z-10 cursor-move"
            style={{
              left: `${layers.logo.leftX}%`,
              top: `${layers.logo.leftY}%`,
              width: `${layers.logo.size}px`,
              height: `${layers.logo.size * 1.2}px`,
              touchAction: "none"
            }}
            onMouseDown={(e) => handleLogoDrag('left', e)}
            onTouchStart={(e) => handleLogoDrag('left', e)}
          >
            {basarnasLogo ? (
              <img 
                src={basarnasLogo.src} 
                alt="Logo Basarnas" 
                className="w-full h-full object-contain pointer-events-none"
                style={{ filter: "drop-shadow(0 0 8px rgba(255, 200, 0, 0.8)) drop-shadow(0 0 15px rgba(255, 180, 0, 0.6))" }}
              />
            ) : (
              <span className="text-[8px] font-bold text-white text-center">BASARNAS</span>
            )}
          </div>
          
          {/* Right Logo (BPP) */}
          <div 
            className="absolute flex items-center justify-center overflow-visible z-10 cursor-move"
            style={{
              left: `${layers.logo.rightX}%`,
              top: `${layers.logo.rightY}%`,
              width: `${layers.logo.size}px`,
              height: `${layers.logo.size * 1.2}px`,
              touchAction: "none"
            }}
            onMouseDown={(e) => handleLogoDrag('right', e)}
            onTouchStart={(e) => handleLogoDrag('right', e)}
          >
            {bppLogo ? (
              <img 
                src={bppLogo.src} 
                alt="Logo BPP" 
                className="w-full h-full object-contain pointer-events-none"
                style={{ filter: "drop-shadow(0 0 8px rgba(255, 200, 0, 0.8)) drop-shadow(0 0 15px rgba(255, 180, 0, 0.6))" }}
              />
            ) : (
              <span className="text-[8px] font-bold text-white text-center">BPP</span>
            )}
          </div>

          {/* Photo Frames */}
          {layers.photos.map((photo, i) => (
            <div
              key={photo.id}
              className={`absolute overflow-hidden border-2 cursor-pointer transition-all ${
                selectedPhoto === i 
                  ? "border-orange-500 ring-2 ring-orange-400" 
                  : "border-white/50 hover:border-white"
              }`}
              style={{
                left: photo.frameX,
                top: photo.frameY,
                width: photo.frameW,
                height: photo.frameH,
                touchAction: "none"
              }}
              onClick={() => setSelectedPhoto(selectedPhoto === i ? null : i)}
            >
              {photo.url ? (
                <img
                  src={photo.url}
                  alt={`Photo ${i + 1}`}
                  draggable={false}
                  className="absolute select-none"
                  onTouchStart={(e) => handleTouchStart(e, i)}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  style={{
                    left: `${photo.imgX}%`,
                    top: `${photo.imgY}%`,
                    transform: `scale(${photo.scale})`,
                    transformOrigin: "top left",
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    touchAction: "none"
                  }}
                />
              ) : (
                <div 
                  className="w-full h-full bg-white/10 flex items-center justify-center"
                  onClick={(e) => {
                    e.stopPropagation();
                    document.getElementById(`photo-upload-${photo.id}`)?.click();
                  }}
                >
                  <ImagePlus className="w-8 h-8 text-white/50" />
                </div>
              )}
              
              {/* Resize Handle - Bottom Right Corner */}
              {selectedPhoto === i && photo.url && (
                <div
                  className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize z-20"
                  style={{ touchAction: "none" }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    
                    const startX = e.clientX;
                    const startY = e.clientY;
                    const startScale = photo.scale;
                    
                    const handleMove = (moveEvent: PointerEvent) => {
                      moveEvent.preventDefault();
                      const dx = moveEvent.clientX - startX;
                      const dy = moveEvent.clientY - startY;
                      const delta = (dx + dy) / 200;
                      const newScale = Math.min(3, Math.max(0.5, startScale + delta));
                      updatePhoto(i, { scale: newScale });
                    };
                    
                    const handleUp = () => {
                      document.removeEventListener('pointermove', handleMove);
                      document.removeEventListener('pointerup', handleUp);
                    };
                    
                    document.addEventListener('pointermove', handleMove, { passive: false });
                    document.addEventListener('pointerup', handleUp);
                  }}
                >
                  <div className="w-4 h-4 bg-orange-500 rounded-tl-sm">
                    <svg viewBox="0 0 10 10" className="w-full h-full text-white">
                      <path d="M9 1L1 9M9 5L5 9M9 9L9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </div>
                </div>
              )}
              
              {/* Reset Button - Top Right Corner (when selected) */}
              {selectedPhoto === i && photo.url && (
                <button
                  className="absolute top-1 right-1 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center z-20"
                  onClick={(e) => {
                    e.stopPropagation();
                    updatePhoto(i, { imgX: 0, imgY: 0, scale: 1 });
                  }}
                >
                  <RefreshCw className="w-3 h-3 text-white" />
                </button>
              )}
              
              <input
                type="file"
                accept="image/*"
                id={`photo-upload-${photo.id}`}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const url = URL.createObjectURL(file);
                  updatePhoto(i, { url, imgX: 0, imgY: 0, scale: 1 });
                }}
              />
            </div>
          ))}

          {/* Title - Draggable (max 2 lines) */}
          <div
            className="absolute cursor-move select-none text-center px-3"
            onMouseDown={(e) => { e.preventDefault(); handleElementDrag("title", e); }}
            onTouchStart={(e) => handleElementDrag("title", e)}
            style={{
              top: `${layers.title.y}%`,
              left: `${layers.title.x}%`,
              transform: "translate(-50%, -50%)",
              fontSize: layers.title.fontSize,
              fontWeight: "bold",
              color: layers.background.url ? layers.title.color : "#FFFFFF",
              textShadow: "0 2px 4px rgba(0,0,0,0.5)",
              touchAction: "none",
              width: "90%",
              lineHeight: 1.2,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden"
            }}
          >
            {layers.title.text || reportTitle || "Judul Laporan"}
          </div>

          {/* Subtitle - Draggable (single line only) */}
          <div
            className="absolute cursor-move select-none text-center px-3"
            onMouseDown={(e) => { e.preventDefault(); handleElementDrag("subtitle", e); }}
            onTouchStart={(e) => handleElementDrag("subtitle", e)}
            style={{
              top: `${layers.subtitle.y}%`,
              left: `${layers.subtitle.x}%`,
              transform: "translate(-50%, -50%)",
              fontSize: layers.subtitle.fontSize,
              color: layers.background.url ? layers.subtitle.color : "#CBD5E1",
              textShadow: "0 2px 4px rgba(0,0,0,0.5)",
              touchAction: "none",
              width: "90%",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis"
            }}
          >
            {layers.subtitle.text || reportSubtitle || "Tempat, Tanggal Bulan Tahun"}
          </div>

          {/* Footer - Draggable */}
          <div
            className="absolute cursor-move select-none text-center px-3"
            onMouseDown={(e) => { e.preventDefault(); handleElementDrag("footer", e); }}
            onTouchStart={(e) => handleElementDrag("footer", e)}
            style={{
              top: `${layers.footer.y}%`,
              left: `${layers.footer.x}%`,
              transform: "translate(-50%, -50%)",
              fontSize: layers.footer.fontSize,
              color: layers.background.url ? layers.footer.color : "#FFFFFF",
              textShadow: "0 2px 4px rgba(0,0,0,0.5)",
              touchAction: "none"
            }}
          >
            {layers.footer.text || "Footer text"}
          </div>
        </div>

        {/* Action buttons above toolbar */}
        {mergedImage && (
          <div className="mt-4 flex gap-2">
            <Button
              onClick={onDownload}
              className="bg-green-600 hover:bg-green-500 text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          </div>
        )}
      </div>

      {/* Bottom Toolbar */}
      <div className="fixed bottom-0 left-0 right-0 bg-[rgba(10,20,35,0.95)] border-t border-white/10 z-50" style={{ height: "72px" }}>
        <div className="flex justify-around items-center h-full px-2">
          <button
            onClick={() => setActiveTool(activeTool === "background" ? null : "background")}
            className={`flex flex-col items-center gap-1 transition-all ${
              activeTool === "background" ? "text-blue-400" : "text-white/70 hover:text-white"
            }`}
          >
            <ImageIcon className="w-5 h-5" />
            <span className="text-[11px]">Background</span>
          </button>
          
          <button
            onClick={() => setActiveTool(activeTool === "photos" ? null : "photos")}
            className={`flex flex-col items-center gap-1 transition-all ${
              activeTool === "photos" ? "text-purple-400" : "text-white/70 hover:text-white"
            }`}
          >
            <ImagePlus className="w-5 h-5" />
            <span className="text-[11px]">Photos</span>
          </button>
          
          <button
            onClick={() => setActiveTool(activeTool === "text" ? null : "text")}
            className={`flex flex-col items-center gap-1 transition-all ${
              activeTool === "text" ? "text-orange-400" : "text-white/70 hover:text-white"
            }`}
          >
            <Type className="w-5 h-5" />
            <span className="text-[11px]">Text</span>
          </button>
          
          <button
            onClick={() => setActiveTool(activeTool === "logo" ? null : "logo")}
            className={`flex flex-col items-center gap-1 transition-all ${
              activeTool === "logo" ? "text-cyan-400" : "text-white/70 hover:text-white"
            }`}
          >
            <Layers className="w-5 h-5" />
            <span className="text-[11px]">Logo</span>
          </button>
          
          <button
            onClick={exportImage}
            disabled={isMerging}
            className="px-3.5 py-2 rounded-xl font-semibold text-black transition-all disabled:opacity-50"
            style={{
              background: "linear-gradient(45deg, #00ff8a, #00ffa2)",
              animation: isMerging ? "none" : "pulseGlow 2s infinite"
            }}
          >
            {isMerging ? (
              <span className="flex items-center gap-1.5 text-sm">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Proses
              </span>
            ) : (
              <span className="text-sm">Export</span>
            )}
          </button>
        </div>
      </div>

      {/* Add pulseGlow animation style */}
      <style jsx global>{`
        @keyframes pulseGlow {
          0% { box-shadow: 0 0 0 rgba(0, 255, 160, 0.6); }
          50% { box-shadow: 0 0 18px rgba(0, 255, 160, 0.9); }
          100% { box-shadow: 0 0 0 rgba(0, 255, 160, 0.6); }
        }
      `}</style>

      {/* Tool Panels - Slide up from bottom */}
      {/* Background Panel */}
      {activeTool === "background" && (
        <div className="fixed bottom-[72px] left-0 right-0 bg-[#0a1525]/95 backdrop-blur-lg border-t border-white/10 rounded-t-2xl p-4 z-40 max-h-[50vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-white font-semibold">Background</h3>
            <button onClick={() => setActiveTool(null)} className="text-white/70 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="space-y-4">
            <button
              onClick={() => backgroundInputRef.current?.click()}
              className="w-full p-3 border border-white/20 rounded-lg bg-white/5 text-white hover:bg-white/10 flex items-center justify-center gap-2"
            >
              <ImageIcon className="w-5 h-5" />
              {layers.background.url ? "Ganti Background" : "Upload Background"}
            </button>
            
            {layers.background.url && (
              <>
                <p className="text-white/50 text-xs text-center">
                  💡 Drag untuk geser, pinch/scroll untuk zoom
                </p>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateLayer("background", { scale: 1, x: 0, y: 0 })}
                  className="w-full border-white/20 text-white hover:bg-white/10"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reset Posisi
                </Button>
                
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => updateLayer("background", { url: null })}
                  className="w-full"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Hapus Background
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Photos Panel */}
      {activeTool === "photos" && (
        <div className="fixed bottom-[72px] left-0 right-0 bg-[#0a1525]/95 backdrop-blur-lg border-t border-white/10 rounded-t-2xl p-4 z-40 max-h-[50vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-white font-semibold">Photos</h3>
            <button onClick={() => setActiveTool(null)} className="text-white/70 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="space-y-4">
            <button
              onClick={() => photoInputRef.current?.click()}
              className="w-full p-3 border border-white/20 rounded-lg bg-white/5 text-white hover:bg-white/10 flex items-center justify-center gap-2"
            >
              <ImagePlus className="w-5 h-5" />
              Tambah Foto
            </button>
            
            {selectedPhoto !== null && layers.photos[selectedPhoto] && (
              <div className="space-y-3 border-t border-white/10 pt-4">
                <h4 className="text-white/70 text-sm">Edit Foto {selectedPhoto + 1}</h4>
                
                <div className="space-y-2">
                  <Label className="text-white/70 text-xs">Zoom: {Math.round(layers.photos[selectedPhoto].scale * 100)}%</Label>
                  <input
                    type="range"
                    min="0.5"
                    max="3"
                    step="0.01"
                    value={layers.photos[selectedPhoto].scale}
                    onChange={(e) => updatePhoto(selectedPhoto, { scale: parseFloat(e.target.value) })}
                    className="w-full"
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updatePhoto(selectedPhoto, { imgX: 0, imgY: 0, scale: 1 })}
                    className="flex-1"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Reset
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      setLayers(prev => ({
                        ...prev,
                        photos: prev.photos.filter((_, i) => i !== selectedPhoto),
                      }));
                      setSelectedPhoto(null);
                    }}
                    className="flex-1"
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Hapus
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Text Panel */}
      {activeTool === "text" && (
        <div className="fixed bottom-[72px] left-0 right-0 bg-[#0a1525]/95 backdrop-blur-lg border-t border-white/10 rounded-t-2xl p-4 z-40 max-h-[60vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-white font-semibold">Text</h3>
            <button onClick={() => setActiveTool(null)} className="text-white/70 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Title Section */}
          <div className="space-y-3 mb-4 pb-4 border-b border-white/10">
            <h4 className="text-orange-400 text-sm font-medium">Judul</h4>
            <p className="text-white/40 text-xs">Default: Judul Laporan dari form</p>
            <Input
              value={layers.title.text}
              onChange={(e) => updateLayer("title", { text: e.target.value })}
              placeholder={reportTitle || "Judul Laporan"}
              className="bg-white/5 border-white/10 text-white"
            />
            <div className="flex gap-2">
              <div className="flex-1">
                <Label className="text-white/50 text-xs">Ukuran: {layers.title.fontSize}px</Label>
                <input
                  type="range"
                  min="10"
                  max="48"
                  value={layers.title.fontSize}
                  onChange={(e) => updateLayer("title", { fontSize: parseInt(e.target.value) })}
                  className="w-full"
                />
              </div>
              <Input
                type="color"
                value={layers.title.color}
                onChange={(e) => updateLayer("title", { color: e.target.value })}
                className="w-10 h-8 p-1"
              />
            </div>
          </div>
          
          {/* Subtitle Section */}
          <div className="space-y-3 mb-4 pb-4 border-b border-white/10">
            <h4 className="text-cyan-400 text-sm font-medium">Subtitle</h4>
            <p className="text-white/40 text-xs">Default: [Tempat], [Tanggal Bulan Tahun]</p>
            <Input
              value={layers.subtitle.text}
              onChange={(e) => updateLayer("subtitle", { text: e.target.value })}
              placeholder={reportSubtitle || "Tempat, Tanggal Bulan Tahun"}
              className="bg-white/5 border-white/10 text-white"
            />
            <div className="flex gap-2">
              <div className="flex-1">
                <Label className="text-white/50 text-xs">Ukuran: {layers.subtitle.fontSize}px</Label>
                <input
                  type="range"
                  min="8"
                  max="32"
                  value={layers.subtitle.fontSize}
                  onChange={(e) => updateLayer("subtitle", { fontSize: parseInt(e.target.value) })}
                  className="w-full"
                />
              </div>
              <Input
                type="color"
                value={layers.subtitle.color}
                onChange={(e) => updateLayer("subtitle", { color: e.target.value })}
                className="w-10 h-8 p-1"
              />
            </div>
          </div>
          
          {/* Footer Section */}
          <div className="space-y-3">
            <h4 className="text-green-400 text-sm font-medium">Footer</h4>
            <Input
              value={layers.footer.text}
              onChange={(e) => updateLayer("footer", { text: e.target.value })}
              placeholder="Footer text..."
              className="bg-white/5 border-white/10 text-white"
            />
            <div className="flex gap-2">
              <div className="flex-1">
                <Label className="text-white/50 text-xs">Ukuran: {layers.footer.fontSize}px</Label>
                <input
                  type="range"
                  min="10"
                  max="20"
                  value={layers.footer.fontSize}
                  onChange={(e) => updateLayer("footer", { fontSize: parseInt(e.target.value) })}
                  className="w-full"
                />
              </div>
              <Input
                type="color"
                value={layers.footer.color}
                onChange={(e) => updateLayer("footer", { color: e.target.value })}
                className="w-10 h-8 p-1"
              />
            </div>
          </div>
          
          <p className="text-white/40 text-xs mt-4 text-center">
            Drag text di canvas untuk mengubah posisi
          </p>
        </div>
      )}

      {/* Logo Panel */}
      {activeTool === "logo" && (
        <div className="fixed bottom-[72px] left-0 right-0 bg-[#0a1525]/95 backdrop-blur-lg border-t border-white/10 rounded-t-2xl p-4 z-40">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-white font-semibold">Logo</h3>
            <button onClick={() => setActiveTool(null)} className="text-white/70 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex items-center justify-center gap-8">
            <div className="text-center">
              <div className="w-14 h-16 bg-slate-700/50 flex items-center justify-center overflow-visible mb-2 rounded">
                {basarnasLogo ? (
                  <img 
                    src={basarnasLogo.src} 
                    alt="Basarnas" 
                    className="w-full h-full object-contain"
                    style={{ filter: "drop-shadow(0 0 8px rgba(255, 200, 0, 0.8)) drop-shadow(0 0 15px rgba(255, 180, 0, 0.6))" }}
                  />
                ) : (
                  <span className="text-[8px] font-bold text-white">BASARNAS</span>
                )}
              </div>
              <span className="text-white/50 text-xs">Basarnas</span>
            </div>
            <div className="text-center">
              <div className="w-14 h-16 bg-slate-700/50 flex items-center justify-center overflow-visible mb-2 rounded">
                {bppLogo ? (
                  <img 
                    src={bppLogo.src} 
                    alt="BPP" 
                    className="w-full h-full object-contain"
                    style={{ filter: "drop-shadow(0 0 8px rgba(255, 200, 0, 0.8)) drop-shadow(0 0 15px rgba(255, 180, 0, 0.6))" }}
                  />
                ) : (
                  <span className="text-[8px] font-bold text-white">BPP</span>
                )}
              </div>
              <span className="text-white/50 text-xs">BPP</span>
            </div>
          </div>
          
          <p className="text-white/40 text-xs mt-4 text-center">
            Logo dengan efek glow kuning
          </p>
        </div>
      )}

      {/* Merged Result Preview */}
      {mergedImage && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-xl p-4 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-white font-semibold">Hasil Export</h3>
              <button 
                onClick={onClosePreview}
                className="text-white/70 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <img src={mergedImage} alt="Merged" className="w-full rounded-lg" />
            
            {/* Action Buttons */}
            <div className="flex gap-2 mt-4">
              <Button
                onClick={onDownload}
                className="flex-1 bg-blue-600 hover:bg-blue-500"
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              <Button
                onClick={onSendToWhatsApp}
                disabled={isSendingWA}
                className="flex-1 bg-green-500 hover:bg-green-400 text-white disabled:opacity-50"
              >
                {isSendingWA ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Mengirim...
                  </>
                ) : (
                  <>
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Kirim WA
                  </>
                )}
              </Button>
            </div>
            
            {/* Tombol Kirim Foto - Muncul setelah teks terkirim */}
            {showSendPhotoButton && (
              <Button
                onClick={onSendPhoto}
                className="w-full mt-2 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white animate-pulse"
              >
                <ImageIcon className="w-4 h-4 mr-2" />
                📸 Kirim Foto ke WhatsApp
              </Button>
            )}
            
            <Button
              onClick={onClosePreview}
              variant="outline"
              className="w-full mt-2"
            >
              Tutup
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default function Home() {
  // State untuk form input
  const [judul, setJudul] = useState("RAPAT BRIEFING PETUGAS LIAISON OFFICER");
  const [tempat, setTempat] = useState("Daring melalui zoom meeting");
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [tanggal, setTanggal] = useState(formatTodayDate()); // Default: hari ini
  const [waktu, setWaktu] = useState("");
  const [pimpinan, setPimpinan] = useState("Kasubdit Siaga dan Latihan");
  const [peserta, setPeserta] = useState<PesertaItem[]>([
    { id: generateId(), text: "Petugas Siaga LO Kementerian Perhubungan" },
    { id: generateId(), text: "Petugas Siaga LO Kementerian Koordinator Bidang Politik dan Keamanan" }
  ]);
  const [pelaksanaan, setPelaksanaan] = useState<PelaksanaanItem[]>([
    { id: generateId(), text: "Pembukaan oleh Kasubdit Siaga dan Latihan", subItems: [] },
    { id: generateId(), text: "Pengarahan Direktur Kesiapsiagaan", subItems: [] }
  ]);
  
  // State untuk jenis tempat (Daring/Luring)
  const [jenisTempat, setJenisTempat] = useState<"daring" | "luring">("daring");
  const [zoomLink, setZoomLink] = useState("");
  const [zoomMeetingTitle, setZoomMeetingTitle] = useState("");
  const [isLoadingZoomTitle, setIsLoadingZoomTitle] = useState(false);
  
  // State untuk template
  const [greeting, setGreeting] = useState(DEFAULT_TEMPLATE.greeting);
  const [yth, setYth] = useState(DEFAULT_TEMPLATE.yth);
  const [ccList, setCcList] = useState<string[]>(DEFAULT_TEMPLATE.ccList);
  
  // State untuk UI
  const [activeTab, setActiveTab] = useState("editor");
  const [previewText, setPreviewText] = useState("");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [showDrafts, setShowDrafts] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  
  // State untuk Image Merger
  const [photos, setPhotos] = useState<FotoItem[]>(
    Array(6).fill(null).map(() => ({ id: generateId(), file: null, preview: "", cachedImage: null }))
  );
  const [mergedImage, setMergedImage] = useState<string>("");
  const [isMerging, setIsMerging] = useState(false);
  
  // State untuk header foto (bisa diedit terpisah dari form utama)
  const [photoHeaderJudul, setPhotoHeaderJudul] = useState("");
  const [photoHeaderTempatTanggal, setPhotoHeaderTempatTanggal] = useState("");
  
  // State for Collage Editor - New Layer System
  const [collageSelected, setCollageSelected] = useState<string | null>("title");
  
  // Default photo frames - Using pixel-based dimensions with percentage positioning
  const defaultPhotoFrames: PhotoLayer[] = [];
  
  const [collageLayers, setCollageLayers] = useState<CollageLayers>({
    background: {
      url: null,
      scale: 1,
      x: 0,
      y: 0
    },
    title: {
      text: "", // Empty so reportTitle (judul) is used by default
      x: 50,
      y: 15,
      fontSize: 28,
      color: "#FFFFFF"
    },
    subtitle: {
      text: "", // Empty so reportSubtitle (tempat, tanggal) is used by default
      x: 50,
      y: 25,
      fontSize: 18,
      color: "#CBD5E1"
    },
    footer: {
      text: "© Direktorat Kesiapsiagaan",
      x: 50,
      y: 95,
      fontSize: 14,
      color: "#FFFFFF"
    },
    logo: {
      leftX: 5,      // percentage
      leftY: 3,      // percentage
      rightX: 85,    // percentage
      rightY: 3,     // percentage
      size: 56       // pixels
    },
    photos: defaultPhotoFrames
  });
  
  // State untuk title styling - Free positioning (keeping for backward compatibility)
  const [titleX, setTitleX] = useState(50); // Percentage (0-100)
  const [titleY, setTitleY] = useState(35); // Percentage (0-100)
  const [subtitleX, setSubtitleX] = useState(50); // Percentage (0-100)
  const [subtitleY, setSubtitleY] = useState(75); // Percentage (0-100)
  const [titleFontSize, setTitleFontSize] = useState(28);
  const [titleFontFamily, setTitleFontFamily] = useState<"Arial" | "Times New Roman" | "Georgia" | "Verdana" | "Tahoma" | "Courier New">("Arial");
  const [subtitleFontSize, setSubtitleFontSize] = useState(20);
  
  // State untuk kalimat penutup di teks utama
  const [kalimatPenutup, setKalimatPenutup] = useState("Demikian disampaikan sebagai laporan. Terima kasih 🙏");
  
  // State untuk Layout & Style
  const [layoutStyle, setLayoutStyle] = useState<"grid" | "vertical" | "horizontal">("grid");
  const [fontStyle, setFontStyle] = useState<"modern" | "classic" | "elegant" | "bold">("modern");
  const [headerBgColor, setHeaderBgColor] = useState("#fff8f0");
  const [accentColor, setAccentColor] = useState("#f97316"); // Orange like reference
  
  // State for custom background
  const [customBackground, setCustomBackground] = useState<string>("");
  const [backgroundBrightness, setBackgroundBrightness] = useState<"light" | "dark">("light");
  
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const backgroundInputRef = useRef<HTMLInputElement | null>(null);
  
  // Preloaded logo images (cached for performance)
  const basarnasLogoRef = useRef<HTMLImageElement | null>(null);
  const bppLogoRef = useRef<HTMLImageElement | null>(null);
  const customBgRef = useRef<HTMLImageElement | null>(null);
  
  // Preload logos when component mounts - fetch as blob to avoid CORS issues
  useEffect(() => {
    const loadLogo = async (src: string): Promise<HTMLImageElement> => {
      try {
        // Fetch as blob to ensure same-origin
        const response = await fetch(src);
        const blob = await response.blob();
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
        
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = dataUrl;
        });
      } catch (error) {
        console.error('Failed to load logo:', src, error);
        throw error;
      }
    };
    
    Promise.all([
      loadLogo('/logos/basarnas.png'),
      loadLogo('/logos/bpp.png')
    ]).then(([basarnas, bpp]) => {
      basarnasLogoRef.current = basarnas;
      bppLogoRef.current = bpp;
    }).catch(err => {
      console.error('Failed to preload logos:', err);
    });
  }, []);
  
  // Format text for WhatsApp (convert editor markers to WhatsApp format)
  const formatForWhatsApp = useCallback((text: string): string => {
    let formatted = text;
    // Bold: **text** → *text*
    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '*$1*');
    // Italic: __text__ → _text_
    formatted = formatted.replace(/__([^_]+)__/g, '_$1_');
    // Strikethrough: ~~text~~ → ~text~ (or keep as is if already ~)
    formatted = formatted.replace(/~~([^~]+)~~/g, '~$1~');
    // Monospace: ```text``` stays the same for WhatsApp
    // Bold+Italic: ***text*** → *_text_*
    formatted = formatted.replace(/\*\*\*([^*]+)\*\*\*/g, '*_$1_*');
    return formatted;
  }, []);

  // Fetch Zoom meeting title from link
  const fetchZoomMeetingTitle = useCallback(async (url: string) => {
    if (!url || !url.includes('zoom.us')) {
      return null;
    }
    
    setIsLoadingZoomTitle(true);
    try {
      // Use our API to fetch the page title
      const response = await fetch(`/api/fetch-title?url=${encodeURIComponent(url)}`);
      const data = await response.json();
      
      if (data.title) {
        setZoomMeetingTitle(data.title);
        // Auto-fill judul if it's still the default
        if (judul === "RAPAT BRIEFING PETUGAS LIAISON OFFICER") {
          setJudul(data.title.toUpperCase());
        }
        return data.title;
      }
    } catch (error) {
      console.error('Failed to fetch Zoom meeting title:', error);
    } finally {
      setIsLoadingZoomTitle(false);
    }
    return null;
  }, [judul]);

  // Handle Zoom link change
  const handleZoomLinkChange = useCallback((link: string) => {
    setZoomLink(link);
    
    // Auto-fetch title when link changes
    if (link.includes('zoom.us') && link.length > 20) {
      // Debounce - wait for user to finish typing
      const timeoutId = setTimeout(() => {
        fetchZoomMeetingTitle(link);
      }, 1000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [fetchZoomMeetingTitle]);

  // Handle jenis tempat change
  const handleJenisTempatChange = useCallback((jenis: "daring" | "luring") => {
    setJenisTempat(jenis);
    if (jenis === "daring") {
      setTempat("Daring melalui zoom meeting");
      setLocationData(null);
    } else {
      setTempat("");
      setZoomLink("");
      setZoomMeetingTitle("");
    }
  }, []);

  // Generate preview text
  const generatePreview = useCallback(() => {
    // Convert judul formatting first
    const judulFormatted = formatForWhatsApp(judul.toUpperCase());
    // Only wrap in bold if it doesn't already contain asterisks
    const judulLine = judulFormatted.includes('*') ? judulFormatted : `*${judulFormatted}*`;
    let text = `${judulLine}\n`;
    text += "------------------------------\n\n";
    text += `_${formatForWhatsApp(greeting)}_,\n\n`;
    text += `*Yth: ${formatForWhatsApp(yth)}*\n`;
    text += "Cc : \n";
    ccList.forEach((cc, index) => {
      text += `${index + 1}. ${formatForWhatsApp(cc)};\n`;
    });
    text += "\n";
    
    text += `Selamat ${getWaktuSalam()}, Mohon izin melaporkan kegiatan ${formatForWhatsApp(judul.toLowerCase())}.\n\n`;
    
    // Location with map image, place name, and address OR Zoom link
    text += `📍 *Tempat:*\n`;
    if (jenisTempat === "daring") {
      text += `${formatForWhatsApp(tempat)}\n`;
      if (zoomLink) {
        text += `🔗 Link Zoom: ${zoomLink}\n`;
      }
    } else if (locationData && locationData.lat && locationData.lng) {
      // Show place name
      text += `📌 *${formatForWhatsApp(locationData.placeName)}*\n`;
      // Show full address
      text += `${formatForWhatsApp(locationData.address)}\n`;
      // Show map link
      text += `🗺️ Lihat di Maps: https://www.google.com/maps?q=${locationData.lat},${locationData.lng}\n`;
    } else {
      text += `${formatForWhatsApp(tempat)}\n`;
    }
    text += "\n";
    
    text += `📅 *Hari dan Tanggal:*\n${tanggal}\n\n`;
    text += `⏰ *Waktu:*\n${waktu}\n\n`;
    text += `👤 *Pimpinan Rapat:*\n${formatForWhatsApp(pimpinan)}\n\n`;
    
    text += `👥 *Peserta Rapat:*\n`;
    peserta.forEach((p) => {
      text += `- ${formatForWhatsApp(p.text)};\n`;
    });
    text += "\n";
    
    text += `🗒️ *Pelaksanaan Rapat:*\n`;
    pelaksanaan.forEach((item, index) => {
      text += `${index + 1}. ${formatForWhatsApp(item.text)};\n`;
      if (item.subItems.length > 0) {
        item.subItems.forEach((sub) => {
          // Align sub-item with start of parent text (after "1. ")
          text += `    - ${formatForWhatsApp(sub)}\n`;
        });
      }
    });
    
    text += `\n${formatForWhatsApp(kalimatPenutup)}\n\n`;
    text += "_Dokumentasi terlampir_";
    
    setPreviewText(text);
    return text;
  }, [judul, tempat, tanggal, waktu, pimpinan, peserta, pelaksanaan, greeting, yth, ccList, kalimatPenutup, formatForWhatsApp, locationData, jenisTempat, zoomLink]);

  const getWaktuSalam = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Pagi";
    if (hour < 15) return "Siang";
    if (hour < 18) return "Sore";
    return "Malam";
  };

  const copyToClipboard = async () => {
    const text = generatePreview();
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Teks berhasil disalin!", { description: "Silakan paste di WhatsApp" });
    } catch {
      toast.error("Gagal menyalin teks");
    }
  };

  const saveDraft = async () => {
    const draft: Draft = {
      id: generateId(),
      judul,
      tempat,
      tanggal,
      waktu,
      pimpinan,
      peserta,
      pelaksanaan,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    try {
      const response = await fetch("/api/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft)
      });
      
      if (response.ok) {
        toast.success("Draft berhasil disimpan!");
        loadDrafts();
      } else {
        throw new Error("Failed to save");
      }
    } catch {
      toast.error("Gagal menyimpan draft");
    }
  };

  const loadDrafts = async () => {
    try {
      const response = await fetch("/api/drafts");
      const data = await response.json();
      setDrafts(data);
    } catch {
      console.error("Failed to load drafts");
    }
  };

  const loadDraft = (draft: Draft) => {
    setJudul(draft.judul);
    setTempat(draft.tempat);
    setTanggal(draft.tanggal);
    setWaktu(draft.waktu);
    setPimpinan(draft.pimpinan);
    setPeserta(draft.peserta);
    setPelaksanaan(draft.pelaksanaan);
    setShowDrafts(false);
    toast.success("Draft berhasil dimuat!");
  };

  const deleteDraft = async (id: string) => {
    try {
      await fetch(`/api/drafts/${id}`, { method: "DELETE" });
      toast.success("Draft berhasil dihapus!");
      loadDrafts();
    } catch {
      toast.error("Gagal menghapus draft");
    }
  };

  const addPeserta = () => setPeserta([...peserta, { id: generateId(), text: "" }]);
  const removePeserta = (id: string) => setPeserta(peserta.filter(p => p.id !== id));
  const updatePeserta = (id: string, text: string) => setPeserta(peserta.map(p => p.id === id ? { ...p, text } : p));

  const addPelaksanaan = () => setPelaksanaan([...pelaksanaan, { id: generateId(), text: "", subItems: [] }]);
  const removePelaksanaan = (id: string) => setPelaksanaan(pelaksanaan.filter(p => p.id !== id));
  const updatePelaksanaan = (id: string, text: string) => setPelaksanaan(pelaksanaan.map(p => p.id === id ? { ...p, text } : p));

  const addSubItem = (parentId: string) => {
    setPelaksanaan(pelaksanaan.map(p => 
      p.id === parentId ? { ...p, subItems: [...p.subItems, ""] } : p
    ));
  };

  const updateSubItem = (parentId: string, index: number, text: string) => {
    setPelaksanaan(pelaksanaan.map(p => 
      p.id === parentId ? { ...p, subItems: p.subItems.map((s, i) => i === index ? text : s) } : p
    ));
  };

  const removeSubItem = (parentId: string, index: number) => {
    setPelaksanaan(pelaksanaan.map(p => 
      p.id === parentId ? { ...p, subItems: p.subItems.filter((_, i) => i !== index) } : p
    ));
  };

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) newExpanded.delete(id);
    else newExpanded.add(id);
    setExpandedItems(newExpanded);
  };

  const addCc = () => setCcList([...ccList, ""]);
  const removeCc = (index: number) => setCcList(ccList.filter((_, i) => i !== index));
  const updateCc = (index: number, text: string) => setCcList(ccList.map((cc, i) => i === index ? text : cc));

  const handlePhotoUpload = (index: number, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const preview = e.target?.result as string;
      // Cache the image immediately for faster merge
      const img = new Image();
      img.onload = () => {
        const newPhotos = [...photos];
        newPhotos[index] = { ...newPhotos[index], file, preview, cachedImage: img };
        setPhotos(newPhotos);
      };
      img.onerror = () => {
        // Still set preview even if caching fails
        const newPhotos = [...photos];
        newPhotos[index] = { ...newPhotos[index], file, preview, cachedImage: null };
        setPhotos(newPhotos);
      };
      img.src = preview;
    };
    reader.readAsDataURL(file);
  };

  const handleMultiplePhotoUpload = async (files: FileList) => {
    const filesArray = Array.from(files).slice(0, 6);
    const currentPhotos = [...photos];
    let slotIndex = 0;
    
    for (let i = 0; i < currentPhotos.length; i++) {
      if (!currentPhotos[i].preview) {
        slotIndex = i;
        break;
      }
    }
    
    // Read files and cache images
    const readPromises = filesArray.map((file, index) => {
      return new Promise<{ index: number; preview: string; file: File; cachedImage: HTMLImageElement | null }>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const preview = e.target?.result as string;
          const img = new Image();
          img.onload = () => {
            resolve({ index: slotIndex + index, preview, file, cachedImage: img });
          };
          img.onerror = () => {
            resolve({ index: slotIndex + index, preview, file, cachedImage: null });
          };
          img.src = preview;
        };
        reader.onerror = () => {
          resolve({ index: slotIndex + index, preview: '', file, cachedImage: null });
        };
        reader.readAsDataURL(file);
      });
    });
    
    try {
      const results = await Promise.all(readPromises);
      const updatedPhotos = [...currentPhotos];
      results.forEach(({ index, preview, file, cachedImage }) => {
        if (index < 6 && preview) updatedPhotos[index] = { id: generateId(), file, preview, cachedImage };
      });
      setPhotos(updatedPhotos);
      
      // Calculate how many photos will exist after upload
      const totalPhotos = updatedPhotos.filter(p => p.preview).length;
      
      // Also update collageLayers.photos - create new entries if they don't exist
      setCollageLayers(prev => {
        const existingCount = prev.photos.filter(p => p.url).length;
        const newCount = Math.max(existingCount, totalPhotos);
        
        // Calculate grid dimensions based on total photos
        const cols = Math.ceil(Math.sqrt(newCount));
        const rows = Math.ceil(newCount / cols);
        
        // Frame dimensions in percentage
        const marginH = 10; // horizontal margin from edges (%)
        const marginTop = 30; // top margin for title (%)
        const marginBottom = 10; // bottom margin for footer (%)
        const gap = 3; // gap between photos (%)
        
        const availableWidth = 100 - (marginH * 2);
        const availableHeight = 100 - marginTop - marginBottom;
        
        const frameW = (availableWidth - (gap * (cols - 1))) / cols;
        const frameH = (availableHeight - (gap * (rows - 1))) / rows;
        
        // Create a map of existing photos by index
        const photoMap = new Map<number, PhotoLayer>();
        prev.photos.forEach((photo, i) => {
          if (photo && photo.url) photoMap.set(i, photo);
        });
        
        // Update with new photos
        results.forEach(({ index, preview }) => {
          if (index < 6 && preview) {
            const col = index % cols;
            const row = Math.floor(index / cols);
            
            const frameX = `${marginH + (col * (frameW + gap))}%`;
            const frameY = `${marginTop + (row * (frameH + gap))}%`;
            
            photoMap.set(index, {
              id: prev.photos[index]?.id || generateId(),
              url: preview,
              frameX,
              frameY,
              frameW: `${frameW}%`,
              frameH: `${frameH}%`,
              imgX: 0,
              imgY: 0,
              scale: 1
            });
          }
        });
        
        // Convert map back to array
        const maxIndex = Math.max(...Array.from(photoMap.keys()), -1);
        const newPhotos = [];
        for (let i = 0; i <= maxIndex; i++) {
          if (photoMap.has(i)) {
            newPhotos.push(photoMap.get(i)!);
          }
        }
        
        return { ...prev, photos: newPhotos };
      });
      
      const uploadedCount = results.filter(r => r.index < 6 && r.preview).length;
      toast.success(`${uploadedCount} foto berhasil diupload`);
      if (files.length > 6) toast.info(`Hanya 6 foto pertama yang dimuat`);
    } catch {
      toast.error("Gagal memuat foto");
    }
  };

  const removePhoto = (index: number) => {
    const newPhotos = [...photos];
    newPhotos[index] = { id: generateId(), file: null, preview: "", cachedImage: null };
    setPhotos(newPhotos);
  };

  // Handle custom background upload
  const handleBackgroundUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setCustomBackground(dataUrl);
      
      // Also update collageLayers
      setCollageLayers(prev => ({
        ...prev,
        background: { ...prev.background, url: dataUrl, scale: 1, x: 0, y: 0 }
      }));
      
      // Detect brightness
      const img = new Image();
      img.onload = () => {
        customBgRef.current = img;
        
        // Create a small canvas to analyze brightness
        const analysisCanvas = document.createElement('canvas');
        const analysisCtx = analysisCanvas.getContext('2d');
        if (!analysisCtx) return;
        
        analysisCanvas.width = 100;
        analysisCanvas.height = 100;
        analysisCtx.drawImage(img, 0, 0, 100, 100);
        
        const imageData = analysisCtx.getImageData(0, 0, 100, 100);
        const data = imageData.data;
        
        let totalBrightness = 0;
        const pixelCount = data.length / 4;
        
        for (let i = 0; i < data.length; i += 4) {
          // Calculate luminance
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          totalBrightness += (0.299 * r + 0.587 * g + 0.114 * b);
        }
        
        const avgBrightness = totalBrightness / pixelCount;
        const brightness = avgBrightness > 128 ? "light" : "dark";
        setBackgroundBrightness(brightness);
        
        toast.success(`Background diunggah! Mode: ${brightness === 'light' ? 'Terang' : 'Gelap'}`);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const removeBackground = () => {
    setCustomBackground("");
    customBgRef.current = null;
    setBackgroundBrightness("light");
    // Also clear from collageLayers
    setCollageLayers(prev => ({
      ...prev,
      background: { ...prev.background, url: null, scale: 1, x: 0, y: 0 }
    }));
    toast.success("Background dihapus");
  };

  const mergeImages = async () => {
    // Check for photos from collageLayers
    const photosWithUrl = collageLayers.photos.filter(p => p.url);
    if (photosWithUrl.length === 0) {
      toast.error("Pilih minimal 1 foto untuk digabung");
      return;
    }

    setIsMerging(true);
    const startTime = Date.now();

    try {
      const canvas = canvasRef.current;
      if (!canvas) { setIsMerging(false); return; }

      const ctx = canvas.getContext("2d");
      if (!ctx) { setIsMerging(false); return; }

      // Use configuration from JSON
      const config = layoutConfig;
      const canvasWidth = config.canvas.width;
      const canvasHeight = config.canvas.height;
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      // ========== BACKGROUND ==========
      // Use collageLayers for background settings
      const bgUrl = collageLayers.background.url || customBackground;
      const bgScaleValue = collageLayers.background.scale * 100;
      const bgPosX = collageLayers.background.x;
      const bgPosY = collageLayers.background.y;
      
      if (bgUrl && customBgRef.current) {
        // Use custom background image with position adjustment
        const bgImg = customBgRef.current;
        const bgRatio = bgImg.width / bgImg.height;
        const canvasRatio = canvasWidth / canvasHeight;
        
        // Calculate base dimensions to cover canvas
        let baseWidth, baseHeight;
        if (bgRatio > canvasRatio) {
          // Image is wider - height determines fit
          baseHeight = canvasHeight;
          baseWidth = canvasHeight * bgRatio;
        } else {
          // Image is taller - width determines fit
          baseWidth = canvasWidth;
          baseHeight = canvasWidth / bgRatio;
        }
        
        // Apply scale
        const scale = bgScaleValue / 100;
        const drawWidth = baseWidth * scale;
        const drawHeight = baseHeight * scale;
        
        // Calculate position - use pixel values directly
        // bgPosX/Y are now in pixels, used as offset from center
        const drawX = -(drawWidth - canvasWidth) / 2 + bgPosX;
        const drawY = -(drawHeight - canvasHeight) / 2 + bgPosY;
        
        ctx.drawImage(bgImg, drawX, drawY, drawWidth, drawHeight);
        
        // Add semi-transparent overlay for better readability
        ctx.fillStyle = backgroundBrightness === "dark" 
          ? "rgba(0, 0, 0, 0.3)" 
          : "rgba(255, 255, 255, 0.3)";
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      } else {
        // Default gradient background from config
        const gradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
        config.background.gradient.stops.forEach((stop: { position: number; color: string }) => {
          gradient.addColorStop(stop.position, stop.color);
        });
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      }

      // ========== HEADER ==========
      const headerConfig = config.header;
      const headerHeight = headerConfig.height;
      
      // Determine colors based on background brightness
      const isDarkBg = backgroundBrightness === "dark";
      const textColor = isDarkBg ? "#FFFFFF" : "#1E293B";
      const subtitleColor = isDarkBg ? "#CBD5E1" : "#64748B";
      
      // Only draw header background if no custom background
      if (!bgUrl) {
        ctx.fillStyle = headerConfig.backgroundColor;
        ctx.fillRect(0, 0, canvasWidth, headerHeight);
        
        // Top accent line (only for default background)
        ctx.fillStyle = headerConfig.topAccentLine.color;
        ctx.fillRect(0, 0, canvasWidth, headerConfig.topAccentLine.height);
      }
      
      // ========== LOGOS ==========
      const basarnasLogo = basarnasLogoRef.current;
      const bppLogo = bppLogoRef.current;
      const logoConfig = headerConfig.logos;
      
      // Left logo (BASARNAS) - Transparent with yellow glow
      const leftLogoConfig = logoConfig[0];
      const leftLogoX = leftLogoConfig.position.x;
      const logoY = leftLogoConfig.position.y;
      const logoWidth = leftLogoConfig.width;
      const logoHeight = leftLogoConfig.height;

      if (basarnasLogo) {
        // Draw logo with yellow glow effect (multiple passes for stronger glow)
        ctx.save();
        
        // First glow pass - larger blur
        ctx.shadowColor = "rgba(255, 200, 0, 0.8)";
        ctx.shadowBlur = 20;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.drawImage(basarnasLogo, leftLogoX, logoY, logoWidth, logoHeight);
        
        // Second glow pass - medium blur
        ctx.shadowColor = "rgba(255, 180, 0, 0.6)";
        ctx.shadowBlur = 12;
        ctx.drawImage(basarnasLogo, leftLogoX, logoY, logoWidth, logoHeight);
        
        // Third glow pass - small blur for definition
        ctx.shadowColor = "rgba(255, 220, 0, 0.9)";
        ctx.shadowBlur = 6;
        ctx.drawImage(basarnasLogo, leftLogoX, logoY, logoWidth, logoHeight);
        
        ctx.restore();
      }

      // Right logo (BPP/SAR Nasional) - Transparent with yellow glow
      const rightLogoConfig = logoConfig[1];
      const rightLogoX = canvasWidth - rightLogoConfig.position.right - rightLogoConfig.width;

      if (bppLogo) {
        ctx.save();
        
        // First glow pass - larger blur
        ctx.shadowColor = "rgba(255, 200, 0, 0.8)";
        ctx.shadowBlur = 20;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.drawImage(bppLogo, rightLogoX, logoY, logoWidth, logoHeight);
        
        // Second glow pass - medium blur
        ctx.shadowColor = "rgba(255, 180, 0, 0.6)";
        ctx.shadowBlur = 12;
        ctx.drawImage(bppLogo, rightLogoX, logoY, logoWidth, logoHeight);
        
        // Third glow pass - small blur for definition
        ctx.shadowColor = "rgba(255, 220, 0, 0.9)";
        ctx.shadowBlur = 6;
        ctx.drawImage(bppLogo, rightLogoX, logoY, logoWidth, logoHeight);
        
        ctx.restore();
      }
      
      // ========== TITLE ==========
      // Use report data as primary source for title/subtitle
      // Title: Judul Laporan
      // Subtitle: [nama tempat], [Tanggal Bulan Tahun]
      const judulText = collageLayers.title.text || judul || "DOKUMENTASI KEGIATAN";
      
      // Format subtitle: Tempat, Tanggal Bulan Tahun
      const formatSubtitle = () => {
        if (collageLayers.subtitle.text) return collageLayers.subtitle.text;
        
        // Parse tanggal if it already includes day name (e.g., "Senin, 12 Januari 2025")
        // or use as-is if it's just the date
        let dateStr = tanggal;
        
        // If tanggal already has the format "Hari, DD Bulan Tahun", extract just "DD Bulan Tahun"
        if (tanggal && tanggal.includes(',')) {
          const parts = tanggal.split(',');
          dateStr = parts.length > 1 ? parts[1].trim() : tanggal;
        }
        
        // Build subtitle: "Tempat, Tanggal Bulan Tahun"
        if (tempat && dateStr) {
          return `${tempat}, ${dateStr}`;
        } else if (tempat) {
          return tempat;
        } else if (dateStr) {
          return dateStr;
        }
        return "";
      };
      
      const tempatTanggalText = formatSubtitle();
      
      // Get settings from collageLayers
      const currentTitleX = collageLayers.title.x;
      const currentTitleY = collageLayers.title.y;
      const currentTitleFontSize = collageLayers.title.fontSize;
      const currentSubtitleX = collageLayers.subtitle.x;
      const currentSubtitleY = collageLayers.subtitle.y;
      const currentSubtitleFontSize = collageLayers.subtitle.fontSize;
      const currentTitleColor = collageLayers.title.color;
      const currentSubtitleColor = collageLayers.subtitle.color;
      
      // Word wrap helper function
      const wrapText = (text: string, maxWidth: number, fontSize: number, fontFamily: string, isBold: boolean = false): string[] => {
        ctx.font = `${isBold ? 'bold' : 'normal'} ${fontSize}px ${fontFamily}`;
        const words = text.split(' ');
        const lines: string[] = [];
        let currentLine = '';
        
        for (const word of words) {
          const testLine = currentLine + (currentLine ? ' ' : '') + word;
          const metrics = ctx.measureText(testLine);
          if (metrics.width > maxWidth && currentLine) {
            lines.push(currentLine);
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        }
        if (currentLine) lines.push(currentLine);
        return lines;
      };
      
      // Calculate positions based on percentage of ENTIRE canvas (same as preview)
      // X position: 0% = left edge, 100% = right edge of canvas
      const titleActualX = (currentTitleX / 100) * canvasWidth;
      const subtitleActualX = (currentSubtitleX / 100) * canvasWidth;
      
      // Y position: 0% = top, 100% = bottom of entire canvas
      const titleActualY = (currentTitleY / 100) * canvasHeight;
      const subtitleActualY = (currentSubtitleY / 100) * canvasHeight;
      
      // Always use center alignment (matching preview with translate(-50%, -50%))
      const titleTextAlign: CanvasTextAlign = "center";
      const subtitleTextAlign: CanvasTextAlign = "center";
      
      // Wrap text with canvas width (minus padding)
      const titleMaxWidth = canvasWidth - 200; // Padding on sides
      const titleLineHeight = currentTitleFontSize + 10;
      const subtitleLineHeight = currentSubtitleFontSize + 8;
      
      const titleLines = wrapText(judulText, titleMaxWidth, currentTitleFontSize, titleFontFamily, true).slice(0, 2);
      const subtitleLines = wrapText(tempatTanggalText, titleMaxWidth, currentSubtitleFontSize, titleFontFamily, false).slice(0, 1);
      
      // Draw title with custom styling
      ctx.textAlign = titleTextAlign;
      ctx.textBaseline = "middle"; // Match preview's translate(-50%, -50%)
      ctx.font = `bold ${currentTitleFontSize}px ${titleFontFamily}`;
      ctx.fillStyle = bgUrl ? currentTitleColor : "#1E293B";
      
      titleLines.forEach((line, idx) => {
        ctx.fillText(line, titleActualX, titleActualY + idx * titleLineHeight);
      });
      
      // Draw subtitle with its own styling
      ctx.textAlign = subtitleTextAlign;
      ctx.font = `${currentSubtitleFontSize}px ${titleFontFamily}`;
      ctx.fillStyle = bgUrl ? currentSubtitleColor : "#64748B";
      
      subtitleLines.forEach((line, idx) => {
        ctx.fillText(line, subtitleActualX, subtitleActualY + idx * subtitleLineHeight);
      });

      // ========== PHOTOS ==========
      // Use collageLayers.photos for rendering
      const collagePhotos = collageLayers.photos.filter(p => p.url);
      const photoCount = collagePhotos.length;
      const footerConfig = config.footer;
      
      // Load all images from collageLayers
      const loadImage = (src: string): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.crossOrigin = "anonymous";
          img.src = src;
        });
      };

      const collageImagePromises = collagePhotos.map(async (photo, index) => {
        // Check if we have cached image from old photos state
        const cachedPhoto = photos.find(p => p.preview === photo.url);
        if (cachedPhoto?.cachedImage && cachedPhoto.cachedImage.complete) {
          return { index, img: cachedPhoto.cachedImage, photo };
        }
        const img = await loadImage(photo.url);
        return { index, img, photo };
      });

      const loadedCollageImages = await Promise.all(collageImagePromises);

      // Draw each photo from collageLayers
      loadedCollageImages.forEach(({ index, img, photo }) => {
        if (!img || !photo) return;
        
        // Convert percentage strings to pixel values
        const parsePercent = (value: string, total: number): number => {
          if (typeof value === 'string' && value.endsWith('%')) {
            return (parseFloat(value) / 100) * total;
          }
          return parseFloat(value as string) || 0;
        };
        
        const frameX = parsePercent(photo.frameX, canvasWidth);
        const frameY = parsePercent(photo.frameY, canvasHeight);
        const frameW = parsePercent(photo.frameW, canvasWidth);
        const frameH = parsePercent(photo.frameH, canvasHeight);
        
        // Draw photo frame (white border with shadow)
        ctx.save();
        ctx.shadowColor = "rgba(0,0,0,0.2)";
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 3;
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.roundRect(
          frameX - 4, 
          frameY - 4, 
          frameW + 8, 
          frameH + 8, 
          8
        );
        ctx.fill();
        ctx.restore();
        
        // Clip to frame and draw image with transformations
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(frameX, frameY, frameW, frameH, 4);
        ctx.clip();
        
        // Apply image transformation (position and scale)
        const scaledWidth = frameW * photo.scale;
        const scaledHeight = frameH * photo.scale;
        const imgOffsetX = (photo.imgX / 100) * frameW;
        const imgOffsetY = (photo.imgY / 100) * frameH;
        
        // Calculate cover fit
        const imgRatio = img.width / img.height;
        const frameRatio = frameW / frameH;
        let drawW: number, drawH: number;
        
        if (imgRatio > frameRatio) {
          // Image is wider - height determines fit
          drawH = scaledHeight;
          drawW = scaledHeight * imgRatio;
        } else {
          // Image is taller - width determines fit
          drawW = scaledWidth;
          drawH = scaledWidth / imgRatio;
        }
        
        // Center the image in the frame initially, then apply offsets
        const baseX = frameX + (frameW - drawW) / 2;
        const baseY = frameY + (frameH - drawH) / 2;
        
        // Apply offset and scale
        const finalX = baseX + imgOffsetX * photo.scale;
        const finalY = baseY + imgOffsetY * photo.scale;
        
        ctx.drawImage(img, finalX, finalY, drawW, drawH);
        ctx.restore();
      });

      // ========== FOOTER ==========
      ctx.fillStyle = footerConfig.backgroundColor;
      ctx.fillRect(0, canvasHeight - footerConfig.height, canvasWidth, footerConfig.height);
      
      // Footer content
      const footerContent = footerConfig.content;
      ctx.fillStyle = footerContent.organization.color;
      ctx.font = `${footerContent.organization.fontWeight} ${footerContent.organization.fontSize}px Arial`;
      ctx.textAlign = "center";
      ctx.fillText(footerContent.organization.text, canvasWidth / 2, canvasHeight - footerConfig.height + 35);
      
      // Contact info
      ctx.fillStyle = footerContent.contactInfo.color;
      ctx.font = `${footerContent.contactInfo.fontSize}px Arial`;
      const contactText = footerContent.contactInfo.items.map((item: { label: string }) => item.label).join("  •  ");
      ctx.fillText(contactText, canvasWidth / 2, canvasHeight - footerConfig.height + 60);

      // Convert to image
      const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
      setMergedImage(dataUrl);
      
      const elapsed = Date.now() - startTime;
      toast.success(`Foto berhasil digabung! (${elapsed}ms)`);
    } catch (error) {
      console.error('Merge error:', error);
      toast.error("Gagal menggabungkan foto");
    } finally {
      setIsMerging(false);
    }
  };

  const downloadMergedImage = () => {
    if (!mergedImage) return;
    const link = document.createElement("a");
    link.download = `dokumentasi-${Date.now()}.jpg`;
    link.href = mergedImage;
    link.click();
  };

  // Helper function to upload image to R2
  const uploadImageToR2 = async (imageData: string, type: "base64" | "url", prefix: string): Promise<string | null> => {
    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, data: imageData, prefix }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        console.error("Upload error:", error);
        return null;
      }
      
      const result = await response.json();
      return result.url;
    } catch (error) {
      console.error("Upload failed:", error);
      return null;
    }
  };

  const shareToWhatsApp = async () => {
    const text = generatePreview();
    let finalText = text;
    const uploadedUrls: string[] = [];
    
    // Show loading toast
    const loadingToast = toast.loading("Menyiapkan laporan...");
    
    try {
      // Upload map image to R2 if location data exists
      if (locationData && locationData.mapImageUrl) {
        toast.loading("Mengunggah peta lokasi...", { id: loadingToast });
        const mapUrl = await uploadImageToR2(locationData.mapImageUrl, "url", "maps");
        if (mapUrl) {
          uploadedUrls.push(`📍 Peta Lokasi: ${mapUrl}`);
        }
      }
      
      // Upload merged photo collage to R2 if it exists
      if (mergedImage) {
        toast.loading("Mengunggah dokumentasi foto...", { id: loadingToast });
        const photoUrl = await uploadImageToR2(mergedImage, "base64", "photos");
        if (photoUrl) {
          uploadedUrls.push(`📸 Dokumentasi: ${photoUrl}`);
        }
      }
      
      // Append uploaded URLs to the message
      if (uploadedUrls.length > 0) {
        finalText = text + "\n\n" + uploadedUrls.join("\n");
      }
      
      toast.dismiss(loadingToast);
      
      // Try Web Share API first (works best on mobile)
      if (navigator.share && navigator.canShare) {
        try {
          // Collect all images to share
          const files: File[] = [];
          
          // Add map image
          if (locationData && locationData.mapImageUrl) {
            const response = await fetch(locationData.mapImageUrl);
            const blob = await response.blob();
            files.push(new File([blob], `lokasi-basarnas.jpg`, { type: 'image/jpeg' }));
          }
          
          // Add merged photo if available
          if (mergedImage) {
            const response = await fetch(mergedImage);
            const blob = await response.blob();
            files.push(new File([blob], `dokumentasi.jpg`, { type: 'image/jpeg' }));
          }
          
          // Check if we can share files
          if (files.length > 0 && navigator.canShare({ files })) {
            await navigator.share({
              title: 'Laporan Kegiatan Basarnas',
              text: text, // Original text without URLs for file share
              files
            });
            toast.success("Berhasil dibagikan!");
            return;
          }
        } catch (error: unknown) {
          // User cancelled or error occurred
          if (error instanceof Error && error.name === 'AbortError') {
            // User cancelled - don't show error
            return;
          }
          console.log('Web Share failed:', error);
        }
      }
      
      // Open WhatsApp with text (including URLs if uploaded)
      const encodedText = encodeURIComponent(finalText);
      window.open(`https://wa.me/?text=${encodedText}`, "_blank");
      
      if (uploadedUrls.length > 0) {
        toast.success("Link gambar ditambahkan ke pesan!");
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error("Share error:", error);
      
      // Fallback: Open WhatsApp with text only
      const encodedText = encodeURIComponent(text);
      window.open(`https://wa.me/?text=${encodedText}`, "_blank");
      toast.info("Membuka WhatsApp dengan teks saja");
    }
  };

  // Download map image function
  const downloadMapImage = async () => {
    if (!locationData || !locationData.mapImageUrl) {
      toast.error("Pilih lokasi terlebih dahulu");
      return;
    }
    
    try {
      const response = await fetch(locationData.mapImageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `peta-${locationData.placeName.replace(/\s+/g, '-')}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Gambar peta berhasil diunduh!");
    } catch {
      toast.error("Gagal mengunduh gambar peta");
    }
  };

  // ==============================
  // STATE FOR WHATSAPP SENDING
  // ==============================
  const [showSendPhotoButton, setShowSendPhotoButton] = useState(false);
  const [exportedPhotoFile, setExportedPhotoFile] = useState<File | null>(null);
  const [isSendingWA, setIsSendingWA] = useState(false);

  // Reset WA states
  const resetWAStates = useCallback(() => {
    setShowSendPhotoButton(false);
    setExportedPhotoFile(null);
    setIsSendingWA(false);
  }, []);

  // Close modal and reset states
  const handleCloseMergedPreview = useCallback(() => {
    setMergedImage("");
    resetWAStates();
  }, [setMergedImage, resetWAStates]);

  // ==============================
  // EXPORT PREVIEW MENJADI FOTO
  // ==============================
  const exportPhotoFile = async (): Promise<File | null> => {
    if (!mergedImage) return null;
    
    const res = await fetch(mergedImage);
    const blob = await res.blob();
    const file = new File([blob], "dokumentasi-basarnas.jpg", { type: "image/jpeg" });
    
    setExportedPhotoFile(file);
    return file;
  };

  // ==============================
  // KIRIM TEXT WA
  // ==============================
  const kirimTextWA = (phoneNumber: string, laporanText: string) => {
    const text = encodeURIComponent(laporanText);
    window.open(
      `https://wa.me/${phoneNumber}?text=${text}`,
      "_blank"
    );
  };

  // ==============================
  // SHARE FOTO KE WA
  // ==============================
  const kirimFotoWA = async () => {
    if (!exportedPhotoFile) {
      toast.error("Foto belum siap");
      return;
    }

    try {
      // Mobile - share file langsung
      if (navigator.canShare && navigator.canShare({ files: [exportedPhotoFile] })) {
        await navigator.share({
          files: [exportedPhotoFile],
          title: "Foto Laporan",
          text: ""
        });
        toast.success("Foto berhasil dikirim!");
      }
      // Desktop - download foto
      else {
        const link = document.createElement("a");
        link.href = mergedImage;
        link.download = "dokumentasi-basarnas.jpg";
        document.body.appendChild(link);
        link.click();
        link.remove();
        toast.success("Foto di-download. Silakan attach di WhatsApp.");
      }
    } catch (err) {
      console.error(err);
      if (err instanceof Error && err.name !== 'AbortError') {
        toast.error("Gagal mengirim foto");
      }
    }
  };

  // ==============================
  // FLOW KIRIM LAPORAN
  // ==============================
  const sendAllToWhatsApp = async () => {
    const laporanText = generatePreview();
    const phoneNumber = ""; // Kosong = pilih kontak manual

    try {
      setIsSendingWA(true);

      // 1️⃣ Export gambar
      if (!mergedImage) {
        toast.error("Silakan klik Export terlebih dahulu!");
        return;
      }
      
      toast.info("Menyiapkan foto...");
      await exportPhotoFile();

      // 2️⃣ Kirim text
      toast.info("Membuka WhatsApp...");
      kirimTextWA(phoneNumber, laporanText);
      
      toast.success("Laporan teks terkirim!");

      // 3️⃣ Munculkan tombol kirim foto setelah 1.5 detik
      setTimeout(() => {
        setShowSendPhotoButton(true);
        setIsSendingWA(false);
      }, 1500);

    } catch (err) {
      console.error(err);
      toast.error("Gagal mengirim laporan");
      setIsSendingWA(false);
    }
  };

  useEffect(() => { loadDrafts(); }, []);
  useEffect(() => { generatePreview(); }, [generatePreview]);

  return (
    <div className="w-screen h-screen flex items-center justify-center overflow-hidden"
      style={{ background: "radial-gradient(circle at top, #102a43, #081520)" }}
    >
      {/* Phone Frame Container */}
      <div
        className="relative w-full max-w-[430px] h-[96vh] overflow-hidden flex flex-col"
        style={{
          aspectRatio: "9/16",
          background: "linear-gradient(180deg, #0e2238, #081624)",
          borderRadius: "24px",
          boxShadow: "0 40px 120px rgba(0,0,0,0.8), inset 0 0 0 1px rgba(255,255,255,0.05)"
        }}
      >
        {/* Header */}
        <header className="flex-shrink-0 px-4 py-3.5 backdrop-blur-lg border-b border-white/10"
          style={{ background: "rgba(255,255,255,0.03)" }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-white">
                Laporan WA Basarnas
              </h1>
              <p className="text-xs text-white/60">
                Direktorat Kesiapsiagaan
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowDrafts(true)}
                className="text-white/70 hover:text-white hover:bg-white/10"
              >
                <Archive className="w-5 h-5" />
              </Button>
              <Button
                size="sm"
                onClick={shareToWhatsApp}
                className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content - Scrollable */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4 bg-slate-800/50 backdrop-blur-sm border border-white/10 p-1 rounded-xl">
              <TabsTrigger value="editor" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-600 data-[state=active]:to-red-500 data-[state=active]:text-white text-slate-400 rounded-lg transition-all duration-300 text-sm py-2">
                <FileText className="w-4 h-4 mr-1" />
                Editor
              </TabsTrigger>
              <TabsTrigger value="preview" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-600 data-[state=active]:to-red-500 data-[state=active]:text-white text-slate-400 rounded-lg transition-all duration-300 text-sm py-2">
                <Eye className="w-4 h-4 mr-1" />
                Preview
              </TabsTrigger>
              <TabsTrigger value="image" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-600 data-[state=active]:to-red-500 data-[state=active]:text-white text-slate-400 rounded-lg transition-all duration-300 text-sm py-2">
                <Layers className="w-4 h-4 mr-1" />
                Foto
              </TabsTrigger>
            </TabsList>

            {/* Editor Tab */}
          <TabsContent value="editor" className="space-y-6">
            {/* Template Section */}
            <Card className="bg-slate-800/50 backdrop-blur-sm border-white/10 shadow-xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-white">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
                    <Smartphone className="w-4 h-4 text-white" />
                  </div>
                  Template & Salam
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Sesuaikan salam dan template laporan
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-300">Salam Pembuka</Label>
                    <WAInput
                      value={greeting}
                      onChange={setGreeting}
                      placeholder="Assalamualaikum..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Yth (Kepada Yth)</Label>
                    <WAInput
                      value={yth}
                      onChange={setYth}
                      placeholder="Direktur Kesiapsiagaan"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-slate-300">Daftar CC</Label>
                    <Button variant="ghost" size="sm" onClick={addCc} className="text-slate-400 hover:text-white hover:bg-white/10">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  {ccList.map((cc, index) => (
                    <div key={index} className="flex gap-2">
                      <span className="flex items-center text-sm text-slate-500 w-6">{index + 1}.</span>
                      <WAInput
                        value={cc}
                        onChange={(val) => updateCc(index, val)}
                        placeholder={`CC ${index + 1}`}
                        className="flex-1"
                      />
                      {ccList.length > 1 && (
                        <Button variant="ghost" size="icon" onClick={() => removeCc(index)} className="text-slate-400 hover:text-red-400 hover:bg-red-500/10">
                          <Minus className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Main Form */}
            <Card className="bg-slate-800/50 backdrop-blur-sm border-white/10 shadow-xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-white">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-white" />
                  </div>
                  Detail Kegiatan
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Judul Kegiatan</Label>
                  <WAInput
                    value={judul}
                    onChange={setJudul}
                    placeholder="RAPAT BRIEFING..."
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <Label className="text-slate-300 flex items-center gap-2">
                      <span className="text-lg">📍</span> Tempat
                    </Label>
                    
                    {/* Toggle Daring/Luring */}
                    <div className="flex gap-2 mb-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={jenisTempat === "daring" ? "default" : "outline"}
                        onClick={() => handleJenisTempatChange("daring")}
                        className={`flex-1 ${jenisTempat === "daring" 
                          ? "bg-blue-600 hover:bg-blue-500 text-white" 
                          : "border-white/30 bg-slate-700/50 text-white hover:bg-slate-700 hover:text-white"}`}
                      >
                        💻 Daring
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={jenisTempat === "luring" ? "default" : "outline"}
                        onClick={() => handleJenisTempatChange("luring")}
                        className={`flex-1 ${jenisTempat === "luring" 
                          ? "bg-green-600 hover:bg-green-500 text-white" 
                          : "border-white/30 bg-slate-700/50 text-white hover:bg-slate-700 hover:text-white"}`}
                      >
                        🏢 Luring
                      </Button>
                    </div>
                    
                    {/* Daring - Zoom Link Input */}
                    {jenisTempat === "daring" ? (
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label className="text-slate-400 text-xs">Nama Tempat (opsional)</Label>
                          <Input
                            value={tempat === "Daring melalui zoom meeting" ? "" : tempat}
                            onChange={(e) => setTempat(e.target.value || "Daring melalui zoom meeting")}
                            placeholder="Daring melalui zoom meeting"
                            className="bg-slate-900/50 border-white/10 text-white placeholder:text-slate-500 focus:border-red-500"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-slate-400 text-xs flex items-center gap-2">
                            🔗 Link Zoom Meeting
                            {isLoadingZoomTitle && <Loader2 className="w-3 h-3 animate-spin" />}
                          </Label>
                          <Input
                            value={zoomLink}
                            onChange={(e) => handleZoomLinkChange(e.target.value)}
                            placeholder="https://zoom.us/j/..."
                            className="bg-slate-900/50 border-white/10 text-white placeholder:text-slate-500 focus:border-red-500"
                          />
                          {zoomMeetingTitle && (
                            <div className="text-xs text-green-400 flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              Judul: {zoomMeetingTitle}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* Luring - Map Location Picker */}
                        <MapLocationPicker
                          value={tempat}
                          onChange={setTempat}
                          onLocationChange={setLocationData}
                          placeholder="Pilih lokasi atau ketik manual"
                        />
                        {/* Map Preview Card */}
                        {locationData && locationData.lat && locationData.lng && (
                          <div className="mt-3 rounded-lg overflow-hidden border border-white/10 bg-slate-900/50">
                            <a
                              href={`https://www.google.com/maps?q=${locationData.lat},${locationData.lng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block hover:ring-2 hover:ring-red-500/50 transition-all"
                            >
                              <div className="relative">
                                <img
                                  src={locationData.mapImageUrl}
                                  alt="Map Location"
                                  className="w-full h-32 object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                                  <div className="flex items-center gap-1.5">
                                    <MapPin className="w-4 h-4 text-red-400" />
                                    <span className="text-sm font-medium text-white truncate">
                                      {locationData.placeName}
                                    </span>
                                  </div>
                                  <span className="text-xs text-white/70 flex items-center gap-1">
                                    <MapIcon className="w-3 h-3" />
                                    Buka Maps
                                  </span>
                                </div>
                              </div>
                            </a>
                            <div className="p-2 text-xs text-slate-400">
                              <p className="truncate">{locationData.address}</p>
                            </div>
                            <div className="px-2 pb-2 flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={downloadMapImage}
                                className="flex-1 border-white/20 bg-white/5 hover:bg-white/10 text-slate-300 text-xs"
                              >
                                <Download className="w-3 h-3 mr-1" />
                                Download Peta
                              </Button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300 flex items-center gap-2">
                      <span className="text-lg">👤</span> Pimpinan
                    </Label>
                    <WAInput
                      value={pimpinan}
                      onChange={setPimpinan}
                      placeholder="Kasubdit Siaga dan Latihan"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-300 flex items-center gap-2">
                      <span className="text-lg">📅</span> Hari dan Tanggal
                    </Label>
                    <WAInput
                      value={tanggal}
                      onChange={setTanggal}
                      placeholder="Rabu, 11 Maret 2026"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300 flex items-center gap-2">
                      <span className="text-lg">⏰</span> Waktu
                    </Label>
                    <WAInput
                      value={waktu}
                      onChange={setWaktu}
                      placeholder="Pukul 09.00 - 10.05 WIB"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Peserta Section */}
            <Card className="bg-slate-800/50 backdrop-blur-sm border-white/10 shadow-xl">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base text-white flex items-center gap-2">
                    <span className="text-lg">👥</span> Peserta Rapat
                  </CardTitle>
                  <Button variant="outline" size="sm" onClick={addPeserta} className="border-white/20 bg-white/5 hover:bg-white/10 text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    Tambah
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {peserta.map((p, index) => (
                  <div key={p.id} className="flex gap-2 items-center group">
                    <span className="text-slate-500">-</span>
                    <WAInput
                      value={p.text}
                      onChange={(val) => updatePeserta(p.id, val)}
                      placeholder={`Peserta ${index + 1}`}
                      className="flex-1"
                    />
                    {peserta.length > 1 && (
                      <Button variant="ghost" size="icon" onClick={() => removePeserta(p.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-red-400 hover:bg-red-500/10">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Pelaksanaan Section */}
            <Card className="bg-slate-800/50 backdrop-blur-sm border-white/10 shadow-xl">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base text-white flex items-center gap-2">
                    <span className="text-lg">🗒️</span> Pelaksanaan Rapat
                  </CardTitle>
                  <Button variant="outline" size="sm" onClick={addPelaksanaan} className="border-white/20 bg-white/5 hover:bg-white/10 text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    Tambah Poin
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {pelaksanaan.map((item, index) => (
                  <div key={item.id} className="space-y-2 group">
                    <div className="flex gap-2 items-center">
                      <span className="font-semibold text-amber-500 w-6">{index + 1}.</span>
                      <WAInput
                        value={item.text}
                        onChange={(val) => updatePelaksanaan(item.id, val)}
                        placeholder={`Poin pelaksanaan ${index + 1}`}
                        className="flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleExpand(item.id)}
                        className="text-slate-400 hover:text-white hover:bg-white/10"
                      >
                        {expandedItems.has(item.id) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </Button>
                      {pelaksanaan.length > 1 && (
                        <Button variant="ghost" size="icon" onClick={() => removePelaksanaan(item.id)} className="text-slate-400 hover:text-red-400 hover:bg-red-500/10">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    {expandedItems.has(item.id) && (
                      <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                        {item.subItems.map((sub, subIndex) => (
                          <div key={subIndex} className="flex gap-2 items-center pl-8">
                            <span className="text-slate-500 w-4">-</span>
                            <WAInput
                              value={sub}
                              onChange={(val) => updateSubItem(item.id, subIndex, val)}
                              placeholder="Sub poin"
                              className="flex-1"
                            />
                            <Button variant="ghost" size="icon" onClick={() => removeSubItem(item.id, subIndex)} className="text-slate-500 hover:text-red-400 hover:bg-red-500/10">
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                        <div className="flex items-center gap-2 ml-8">
                          <Button variant="ghost" size="sm" onClick={() => addSubItem(item.id)} className="text-slate-400 hover:text-white hover:bg-white/5">
                            <Plus className="w-4 h-4 mr-2" />
                            Sub Poin
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Kalimat Penutup Section */}
            <Card className="bg-slate-800/50 backdrop-blur-sm border-white/10 shadow-xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-white">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                    <MessageSquare className="w-4 h-4 text-white" />
                  </div>
                  Kalimat Penutup
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Kalimat penutup di akhir laporan WhatsApp
                </CardDescription>
              </CardHeader>
              <CardContent>
                <WATextarea
                  value={kalimatPenutup}
                  onChange={setKalimatPenutup}
                  placeholder="Demikian disampaikan sebagai laporan. Terima kasih 🙏"
                  rows={2}
                />
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <Button onClick={saveDraft} variant="outline" className="flex-1 sm:flex-none border-white/20 bg-white/5 hover:bg-white/10 text-white backdrop-blur-sm transition-all duration-300 hover:scale-105">
                <Save className="w-4 h-4 mr-2" />
                Simpan Draft
              </Button>
              <Button onClick={copyToClipboard} className="flex-1 sm:flex-none bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-lg shadow-blue-500/25 transition-all duration-300 hover:scale-105">
                <Copy className="w-4 h-4 mr-2" />
                Salin Teks
              </Button>
              <Button onClick={shareToWhatsApp} className="flex-1 sm:flex-none bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white shadow-lg shadow-green-500/25 transition-all duration-300 hover:scale-105">
                <Send className="w-4 h-4 mr-2" />
                Kirim ke WhatsApp
              </Button>
            </div>
          </TabsContent>

          {/* Preview Tab */}
          <TabsContent value="preview">
            <Card className="bg-slate-800/50 backdrop-blur-sm border-white/10 shadow-xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-green-600/20 to-green-500/10 border-b border-white/10">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-white">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                      <MessageSquare className="w-4 h-4 text-white" />
                    </div>
                    Preview WhatsApp
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={copyToClipboard} className="border-white/20 bg-white/5 hover:bg-white/10 text-white">
                      <Copy className="w-4 h-4 mr-2" />
                      Salin
                    </Button>
                    <Button size="sm" onClick={shareToWhatsApp} className="bg-gradient-to-r from-green-600 to-green-500 text-white">
                      <Send className="w-4 h-4 mr-2" />
                      Kirim ke WA
                    </Button>
                  </div>
                </div>
                <CardDescription className="text-slate-400">
                  Tampilan teks yang akan dikirim ke WhatsApp
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {/* WhatsApp Chat Header */}
                <div className="bg-green-700 px-4 py-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-300 flex items-center justify-center">
                    <span className="text-green-700 font-bold text-sm">B</span>
                  </div>
                  <div>
                    <p className="text-white font-medium text-sm">Basarnas Group</p>
                    <p className="text-green-200 text-xs">online</p>
                  </div>
                </div>
                {/* WhatsApp Chat Background */}
                <ScrollArea className="h-[500px] w-full bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgdmlld0JveD0iMCAwIDYwIDYwIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMwMDAiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] bg-green-50 dark:bg-slate-900">
                  <div className="p-4 space-y-3">
                    {/* Main message bubble */}
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-4 max-w-[90%]">
                      {/* Render message with map image inserted after "Tempat" section */}
                      <div className="text-sm font-sans text-slate-700 dark:text-slate-200">
                        {/* Header section */}
                        <div className="whitespace-pre-wrap font-bold">{judul.toUpperCase()}</div>
                        <div className="whitespace-pre-wrap">------------------------------{"\n\n"}</div>
                        <div className="whitespace-pre-wrap italic">_{greeting}_{"\n\n"}</div>
                        <div className="whitespace-pre-wrap">*Yth: {yth}*{"\n"}Cc : {"\n"}{ccList.map((cc, i) => `${i + 1}. ${cc};`).join("\n")}{"\n\n"}</div>
                        <div className="whitespace-pre-wrap">Selamat {getWaktuSalam()}, Mohon izin melaporkan kegiatan {judul.toLowerCase()}.{"\n\n"}</div>
                        
                        {/* Tempat section */}
                        <div className="whitespace-pre-wrap">📍 *Tempat:*{"\n"}</div>
                        
                        {/* Location text or default */}
                        {locationData && locationData.lat && locationData.lng ? (
                          <div className="tempat-section">
                            {/* Place name and address */}
                            <div className="whitespace-pre-wrap">📌 *{locationData.placeName}*{"\n"}{locationData.address}{"\n"}</div>
                            
                            {/* Map Image - visually grouped with Tempat */}
                            <div className="my-2 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                              <a
                                href={`https://www.google.com/maps?q=${locationData.lat},${locationData.lng}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block hover:opacity-90 transition-opacity"
                              >
                                <div className="relative">
                                  <img
                                    src={locationData.mapImageUrl}
                                    alt="Map Location"
                                    className="w-full h-36 object-cover"
                                  />
                                  <div className="absolute bottom-1 right-1 bg-white/90 dark:bg-slate-800/90 px-1.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                                    <MapPin className="w-2.5 h-2.5 text-red-500" />
                                    <span className="text-[10px] font-medium text-slate-700 dark:text-slate-300">Buka di Maps</span>
                                  </div>
                                </div>
                              </a>
                            </div>
                            
                            {/* Maps link */}
                            <div className="whitespace-pre-wrap text-xs text-slate-500">🗺️ Lihat di Maps: https://www.google.com/maps?q={locationData.lat},{locationData.lng}{"\n\n"}</div>
                          </div>
                        ) : (
                          <div className="whitespace-pre-wrap">{tempat}{"\n\n"}</div>
                        )}
                        
                        {/* Rest of the message */}
                        <div className="whitespace-pre-wrap">📅 *Hari dan Tanggal:*{"\n"}{tanggal}{"\n\n"}</div>
                        <div className="whitespace-pre-wrap">⏰ *Waktu:*{"\n"}{waktu}{"\n\n"}</div>
                        <div className="whitespace-pre-wrap">👤 *Pimpinan Rapat:*{"\n"}{pimpinan}{"\n\n"}</div>
                        <div className="whitespace-pre-wrap">👥 *Peserta Rapat:*{"\n"}{peserta.map(p => `- ${p.text};`).join("\n")}{"\n\n"}</div>
                        <div className="whitespace-pre-wrap">🗒️ *Pelaksanaan Rapat:*{"\n"}{pelaksanaan.map((item, i) => {
                          let text = `${i + 1}. ${item.text};`;
                          if (item.subItems.length > 0) {
                            text += "\n" + item.subItems.map(sub => `    - ${sub}`).join("\n");
                          }
                          return text;
                        }).join("\n")}{"\n\n"}</div>
                        <div className="whitespace-pre-wrap">{kalimatPenutup}{"\n\n"}</div>
                        <div className="whitespace-pre-wrap italic">_Dokumentasi terlampir_</div>
                      </div>
                      
                      <div className="flex justify-end items-center gap-1 mt-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                        <span className="text-xs text-slate-400">
                          {new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <span className="text-blue-500">✓✓</span>
                      </div>
                    </div>

                    {/* Download button outside the message bubble */}
                    {locationData && locationData.lat && locationData.lng && (
                      <div className="max-w-[90%]">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={downloadMapImage}
                          className="w-full border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs"
                        >
                          <Download className="w-3 h-3 mr-1" />
                          Download Gambar Peta
                        </Button>
                        <p className="text-xs text-slate-400 mt-1 italic">
                          💡 Download gambar peta, lalu lampirkan manual ke WhatsApp
                        </p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Image Merger Tab - Collage Editor */}
          <TabsContent value="image" className="space-y-4">
            <CollageEditor
              layers={collageLayers}
              setLayers={setCollageLayers}
              selected={collageSelected}
              setSelected={setCollageSelected}
              canvasWidth={layoutConfig.canvas.width}
              canvasHeight={layoutConfig.canvas.height}
              backgroundBrightness={backgroundBrightness}
              onBackgroundUpload={handleBackgroundUpload}
              onPhotoUpload={handleMultiplePhotoUpload}
              onMerge={mergeImages}
              onDownload={downloadMergedImage}
              isMerging={isMerging}
              setIsMerging={setIsMerging}
              mergedImage={mergedImage}
              setMergedImage={setMergedImage}
              basarnasLogo={basarnasLogoRef.current}
              bppLogo={bppLogoRef.current}
              reportTitle={judul}
              reportSubtitle={(() => {
                let dateStr = tanggal;
                if (tanggal && tanggal.includes(',')) {
                  const parts = tanggal.split(',');
                  dateStr = parts.length > 1 ? parts[1].trim() : tanggal;
                }
                return tempat && dateStr ? `${tempat}, ${dateStr}` : tempat || dateStr || "";
              })()}
              onSendToWhatsApp={sendAllToWhatsApp}
              showSendPhotoButton={showSendPhotoButton}
              isSendingWA={isSendingWA}
              onSendPhoto={kirimFotoWA}
              onClosePreview={handleCloseMergedPreview}
            />
            {/* Hidden Canvas */}
            <canvas ref={canvasRef} className="hidden" />
          </TabsContent>
        </Tabs>
        </div>
        {/* End Main Content - Scrollable */}

        {/* Drafts Dialog */}
        <Dialog open={showDrafts} onOpenChange={setShowDrafts}>
        <DialogContent className="max-w-2xl max-h-[80vh] bg-slate-800 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Archive className="w-5 h-5" />
              Draft Tersimpan
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Pilih draft untuk dimuat atau dihapus
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[400px]">
            {drafts.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <History className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Belum ada draft tersimpan</p>
              </div>
            ) : (
              <div className="space-y-3 p-2">
                {drafts.map((draft) => (
                  <div
                    key={draft.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-slate-900/50 border border-white/10 hover:bg-slate-900/70 hover:border-red-500/30 transition-all duration-300"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate text-white">{draft.judul}</p>
                      <p className="text-sm text-slate-400">
                        {draft.tempat} • {draft.tanggal}
                      </p>
                      <p className="text-xs text-slate-500">
                        Disimpan: {new Date(draft.updatedAt).toLocaleString("id-ID")}
                      </p>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button size="sm" variant="outline" onClick={() => loadDraft(draft)} className="border-white/20 bg-white/5 hover:bg-white/10 text-white">
                        <Eye className="w-4 h-4 mr-1" />
                        Muat
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => deleteDraft(draft.id)} className="bg-red-600 hover:bg-red-500">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDrafts(false)} className="border-white/20 bg-white/5 hover:bg-white/10 text-white">
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

          {/* Footer */}
          <footer className="flex-shrink-0 px-4 py-3 backdrop-blur-lg border-t border-white/10 mt-auto"
            style={{ background: "rgba(255,255,255,0.03)" }}
          >
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center">
                  <MessageSquare className="w-3 h-3 text-white" />
                </div>
                <span className="text-white text-sm font-semibold">Basarnas</span>
              </div>
              <p className="text-white/50 text-[10px]">
                © 2024 Laporan WhatsApp - Direktorat Kesiapsiagaan
              </p>
            </div>
          </footer>
      </div>
      {/* End Phone Frame Container */}
    </div>
  );
}
