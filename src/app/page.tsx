"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Bold, Italic, Copy, Save, FileText, ImagePlus, Trash2, 
  Download, Eye, RefreshCw, Plus, Minus, ChevronDown, ChevronUp,
  Smartphone, MessageSquare, Send, Archive, History, X, Check,
  ImageIcon, Layers, Share2, Palette, Type,
  Strikethrough, Code, MapPin, Map as MapIcon, Loader2
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

// Title Position Preview Component - Draggable title/subtitle positioning
interface TitlePositionPreviewProps {
  titleX: number;
  titleY: number;
  subtitleX: number;
  subtitleY: number;
  titleText: string;
  subtitleText: string;
  titleFontSize: number;
  subtitleFontSize: number;
  titleFontFamily: string;
  customBackground: string;
  backgroundBrightness: "light" | "dark";
  bgPositionX: number;
  bgPositionY: number;
  bgScale: number;
  onTitlePositionChange: (x: number, y: number) => void;
  onSubtitlePositionChange: (x: number, y: number) => void;
}

const TitlePositionPreview = ({
  titleX,
  titleY,
  subtitleX,
  subtitleY,
  titleText,
  subtitleText,
  titleFontSize,
  subtitleFontSize,
  titleFontFamily,
  customBackground,
  backgroundBrightness,
  bgPositionX,
  bgPositionY,
  bgScale,
  onTitlePositionChange,
  onSubtitlePositionChange,
}: TitlePositionPreviewProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDraggingTitle, setIsDraggingTitle] = useState(false);
  const [isDraggingSubtitle, setIsDraggingSubtitle] = useState(false);

  const handleMouseDown = (e: React.MouseEvent, type: 'title' | 'subtitle') => {
    e.preventDefault();
    if (type === 'title') {
      setIsDraggingTitle(true);
    } else {
      setIsDraggingSubtitle(true);
    }
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

    if (isDraggingTitle) {
      onTitlePositionChange(Math.round(x), Math.round(y));
    } else if (isDraggingSubtitle) {
      onSubtitlePositionChange(Math.round(x), Math.round(y));
    }
  }, [isDraggingTitle, isDraggingSubtitle, onTitlePositionChange, onSubtitlePositionChange]);

  const handleMouseUp = useCallback(() => {
    setIsDraggingTitle(false);
    setIsDraggingSubtitle(false);
  }, []);

  // Touch event handlers
  const handleTouchStart = (e: React.TouchEvent, type: 'title' | 'subtitle') => {
    e.preventDefault(); // Prevent scroll
    if (type === 'title') {
      setIsDraggingTitle(true);
    } else {
      setIsDraggingSubtitle(true);
    }
  };

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!containerRef.current) return;
    if (e.touches.length === 0) return;
    
    e.preventDefault(); // Prevent scroll during drag
    
    const touch = e.touches[0];
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((touch.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((touch.clientY - rect.top) / rect.height) * 100));

    if (isDraggingTitle) {
      onTitlePositionChange(Math.round(x), Math.round(y));
    } else if (isDraggingSubtitle) {
      onSubtitlePositionChange(Math.round(x), Math.round(y));
    }
  }, [isDraggingTitle, isDraggingSubtitle, onTitlePositionChange, onSubtitlePositionChange]);

  const handleTouchEnd = useCallback(() => {
    setIsDraggingTitle(false);
    setIsDraggingSubtitle(false);
  }, []);

  useEffect(() => {
    if (isDraggingTitle || isDraggingSubtitle) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleTouchEnd);
      // Prevent body scroll during drag
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      document.body.style.overflow = '';
    };
  }, [isDraggingTitle, isDraggingSubtitle, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  // Determine text alignment based on X position
  const getTitleAlign = (x: number): CanvasTextAlign => {
    if (x < 30) return "left";
    if (x > 70) return "right";
    return "center";
  };

  const titleAlign = getTitleAlign(titleX);
  const subtitleAlign = getTitleAlign(subtitleX);

  const isDarkBg = backgroundBrightness === "dark";
  const textColor = isDarkBg ? "#FFFFFF" : "#1E293B";
  const subtitleColor = isDarkBg ? "#CBD5E1" : "#64748B";

  // Scale fonts for preview (smaller than actual)
  const previewTitleSize = Math.max(10, titleFontSize * 0.4);
  const previewSubtitleSize = Math.max(8, subtitleFontSize * 0.4);

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        className="relative w-full h-48 rounded-xl overflow-hidden cursor-crosshair select-none border-2 border-white/10"
        style={{
          touchAction: 'none',
        }}
      >
        {/* Background layer with position and scale */}
        {customBackground && (
          <img
            src={customBackground}
            alt="Background preview"
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              objectPosition: `${bgPositionX}% ${bgPositionY}%`,
              transform: `scale(${bgScale / 100})`,
              transformOrigin: `${bgPositionX}% ${bgPositionY}%`,
            }}
          />
        )}
        {/* Default gradient fallback */}
        {!customBackground && (
          <div 
            className="absolute inset-0"
            style={{
              background: "linear-gradient(180deg, #fff8f0 0%, #fef3e2 100%)",
            }}
          />
        )}
        {/* Logo placeholders */}
        <div className="absolute top-3 left-3 w-10 h-10 rounded-full bg-white/90 shadow-md flex items-center justify-center text-[8px] font-bold text-slate-600 z-10">
          LOGO
        </div>
        <div className="absolute top-3 right-3 w-10 h-10 rounded-full bg-white/90 shadow-md flex items-center justify-center text-[8px] font-bold text-slate-600 z-10">
          LOGO
        </div>

        {/* Draggable Title - position matches canvas rendering logic */}
        <div
          className={`absolute cursor-move transition-shadow ${isDraggingTitle ? 'z-20' : 'z-10'}`}
          style={{
            left: `calc(15% + ${titleX} * 0.7%)`, // 15% start + 70% range
            top: `calc(20% + ${titleY} * 0.6%)`, // 20% start + 60% range
            transform: titleAlign === 'center' ? 'translate(-50%, 0)' : titleAlign === 'right' ? 'translate(-100%, 0)' : 'translate(0, 0)',
            textAlign: titleAlign,
          }}
          onMouseDown={(e) => handleMouseDown(e, 'title')}
          onTouchStart={(e) => handleTouchStart(e, 'title')}
        >
          <div 
            className={`px-2 py-1 rounded-md transition-all ${isDraggingTitle ? 'ring-2 ring-orange-500 ring-offset-1 ring-offset-transparent' : 'hover:ring-1 hover:ring-orange-500/50'}`}
            style={{ backgroundColor: isDraggingTitle ? 'rgba(249, 115, 22, 0.2)' : 'transparent' }}
          >
            <span 
              className="font-bold whitespace-nowrap block"
              style={{ 
                fontSize: `${previewTitleSize}px`,
                fontFamily: titleFontFamily,
                color: customBackground ? textColor : "#1E293B",
              }}
            >
              {titleText.slice(0, 30)}{titleText.length > 30 ? '...' : ''}
            </span>
          </div>
        </div>

        {/* Draggable Subtitle - position matches canvas rendering logic */}
        <div
          className={`absolute cursor-move transition-shadow ${isDraggingSubtitle ? 'z-20' : 'z-10'}`}
          style={{
            left: `calc(15% + ${subtitleX} * 0.7%)`, // 15% start + 70% range
            top: `calc(20% + ${subtitleY} * 0.6%)`, // 20% start + 60% range
            transform: subtitleAlign === 'center' ? 'translate(-50%, 0)' : subtitleAlign === 'right' ? 'translate(-100%, 0)' : 'translate(0, 0)',
            textAlign: subtitleAlign,
          }}
          onMouseDown={(e) => handleMouseDown(e, 'subtitle')}
          onTouchStart={(e) => handleTouchStart(e, 'subtitle')}
        >
          <div 
            className={`px-2 py-1 rounded-md transition-all ${isDraggingSubtitle ? 'ring-2 ring-cyan-500 ring-offset-1 ring-offset-transparent' : 'hover:ring-1 hover:ring-cyan-500/50'}`}
            style={{ backgroundColor: isDraggingSubtitle ? 'rgba(6, 182, 212, 0.2)' : 'transparent' }}
          >
            <span 
              className="whitespace-nowrap block"
              style={{ 
                fontSize: `${previewSubtitleSize}px`,
                fontFamily: titleFontFamily,
                color: customBackground ? subtitleColor : "#64748B",
              }}
            >
              {subtitleText.slice(0, 35)}{subtitleText.length > 35 ? '...' : ''}
            </span>
          </div>
        </div>

        {/* Position indicators */}
        <div className="absolute bottom-2 left-2 right-2 flex justify-between text-[10px]">
          <span className="bg-orange-500/80 text-white px-1.5 py-0.5 rounded">
            X:{titleX}% Y:{titleY}%
          </span>
          <span className="bg-cyan-500/80 text-white px-1.5 py-0.5 rounded">
            X:{subtitleX}% Y:{subtitleY}%
          </span>
        </div>

        {/* Grid overlay for guidance */}
        <div className="absolute inset-0 pointer-events-none opacity-10">
          <div className="absolute left-1/3 top-0 bottom-0 w-px bg-slate-500" />
          <div className="absolute left-2/3 top-0 bottom-0 w-px bg-slate-500" />
          <div className="absolute top-1/3 left-0 right-0 h-px bg-slate-500" />
          <div className="absolute top-2/3 left-0 right-0 h-px bg-slate-500" />
        </div>
      </div>
      <p className="text-center text-xs text-slate-500">
        Klik dan geser <span className="text-orange-400">judul</span> atau <span className="text-cyan-400">subtitle</span> untuk mengubah posisi
      </p>
    </div>
  );
};

export default function Home() {
  // State untuk form input
  const [judul, setJudul] = useState("RAPAT BRIEFING PETUGAS LIAISON OFFICER");
  const [tempat, setTempat] = useState("Daring melalui zoom meeting");
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [tanggal, setTanggal] = useState("");
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
  
  // State untuk title styling - Free positioning
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
  
  // State for background position adjustment
  const [bgPositionX, setBgPositionX] = useState(50); // Percentage (0-100)
  const [bgPositionY, setBgPositionY] = useState(50); // Percentage (0-100)
  const [bgScale, setBgScale] = useState(100); // Percentage (100 = fit, >100 = zoom in)
  
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
    
    // Location with map image, place name, and address
    text += `📍 *Tempat:*\n`;
    if (locationData && locationData.lat && locationData.lng) {
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
  }, [judul, tempat, tanggal, waktu, pimpinan, peserta, pelaksanaan, greeting, yth, ccList, kalimatPenutup, formatForWhatsApp, locationData]);

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
    toast.success("Background dihapus");
  };

  const mergeImages = async () => {
    const validPhotos = photos.filter(p => p.preview);
    if (validPhotos.length === 0) {
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
      if (customBackground && customBgRef.current) {
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
        const scale = bgScale / 100;
        const drawWidth = baseWidth * scale;
        const drawHeight = baseHeight * scale;
        
        // Calculate position with offset
        const offsetX = ((bgPositionX / 100) - 0.5) * (drawWidth - canvasWidth);
        const offsetY = ((bgPositionY / 100) - 0.5) * (drawHeight - canvasHeight);
        const drawX = -(drawWidth - canvasWidth) / 2 - offsetX;
        const drawY = -(drawHeight - canvasHeight) / 2 - offsetY;
        
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
      if (!customBackground) {
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
      
      // Left logo (BASARNAS)
      const leftLogoConfig = logoConfig[0];
      const leftLogoX = leftLogoConfig.position.x;
      const logoY = leftLogoConfig.position.y;
      const logoSize = leftLogoConfig.width;

      if (basarnasLogo) {
        // White circular background
        ctx.save();
        ctx.shadowColor = "rgba(0,0,0,0.2)";
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 3;
        ctx.beginPath();
        ctx.arc(leftLogoX + logoSize/2, logoY + logoSize/2, logoSize/2 + 5, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.restore();
        
        // Clip and draw logo
        ctx.save();
        ctx.beginPath();
        ctx.arc(leftLogoX + logoSize/2, logoY + logoSize/2, logoSize/2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(basarnasLogo, leftLogoX, logoY, logoSize, logoSize);
        ctx.restore();
      }

      // Right logo (BPP/SAR Nasional)
      const rightLogoConfig = logoConfig[1];
      const rightLogoX = canvasWidth - rightLogoConfig.position.right - rightLogoConfig.width;

      if (bppLogo) {
        ctx.save();
        ctx.shadowColor = "rgba(0,0,0,0.2)";
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 3;
        ctx.beginPath();
        ctx.arc(rightLogoX + logoSize/2, logoY + logoSize/2, logoSize/2 + 5, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
        ctx.restore();
        
        ctx.save();
        ctx.beginPath();
        ctx.arc(rightLogoX + logoSize/2, logoY + logoSize/2, logoSize/2, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(bppLogo, rightLogoX, logoY, logoSize, logoSize);
        ctx.restore();
      }
      
      // ========== TITLE ==========
      const judulText = photoHeaderJudul || judul || "DOKUMENTASI KEGIATAN";
      const tempatTanggalText = photoHeaderTempatTanggal || `${tempat}${tempat && tanggal ? ', ' : ''}${tanggal}`;
      
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
      
      // Calculate positions based on percentage
      // Title area is between logos (approximately center 800px of 1240px canvas)
      // Y position is relative to header height (280px)
      const titleAreaStartX = 180; // After left logo
      const titleAreaEndX = canvasWidth - 180; // Before right logo
      const titleAreaWidth = titleAreaEndX - titleAreaStartX;
      
      // X position: 0% = left edge of title area, 100% = right edge
      const titleActualX = titleAreaStartX + (titleX / 100) * titleAreaWidth;
      const subtitleActualX = titleAreaStartX + (subtitleX / 100) * titleAreaWidth;
      
      // Y position: 0% = top (with padding), 100% = bottom (with padding)
      const headerPaddingTop = 50;
      const headerPaddingBottom = 20;
      const usableHeaderHeight = headerHeight - headerPaddingTop - headerPaddingBottom;
      
      const titleActualY = headerPaddingTop + (titleY / 100) * usableHeaderHeight;
      const subtitleActualY = headerPaddingTop + (subtitleY / 100) * usableHeaderHeight;
      
      // Determine text alignment based on X position
      const getTextAlign = (x: number): CanvasTextAlign => {
        if (x < 30) return "left";
        if (x > 70) return "right";
        return "center";
      };
      
      const titleTextAlign = getTextAlign(titleX);
      const subtitleTextAlign = getTextAlign(subtitleX);
      
      // Wrap text with title area width
      const titleMaxWidth = titleAreaWidth - 40; // Extra padding
      const titleLineHeight = titleFontSize + 10;
      const subtitleLineHeight = subtitleFontSize + 8;
      
      const titleLines = wrapText(judulText, titleMaxWidth, titleFontSize, titleFontFamily, true).slice(0, 3);
      const subtitleLines = wrapText(tempatTanggalText, titleMaxWidth, subtitleFontSize, titleFontFamily, false).slice(0, 2);
      
      // Debug: Draw title background area (for debugging, remove later)
      // ctx.fillStyle = "rgba(255,0,0,0.1)";
      // ctx.fillRect(titleAreaStartX, headerPaddingTop, titleAreaWidth, usableHeaderHeight);
      
      // Draw title with custom styling
      ctx.textAlign = titleTextAlign;
      ctx.textBaseline = "top";
      ctx.font = `bold ${titleFontSize}px ${titleFontFamily}`;
      ctx.fillStyle = customBackground ? textColor : "#1E293B";
      
      titleLines.forEach((line, idx) => {
        ctx.fillText(line, titleActualX, titleActualY + idx * titleLineHeight);
      });
      
      // Draw subtitle with its own styling
      ctx.textAlign = subtitleTextAlign;
      ctx.font = `${subtitleFontSize}px ${titleFontFamily}`;
      ctx.fillStyle = customBackground ? subtitleColor : "#64748B";
      
      subtitleLines.forEach((line, idx) => {
        ctx.fillText(line, subtitleActualX, subtitleActualY + idx * subtitleLineHeight);
      });

      // ========== PHOTOS ==========
      const photoGridConfig = config.photoGrid;
      const footerConfig = config.footer;
      const photoCount = validPhotos.length;
      const availableHeight = canvasHeight - headerHeight - footerConfig.height;
      
      const cols = photoGridConfig.columns;
      const rows = Math.ceil(Math.min(photoCount, photoGridConfig.maxPhotos) / cols);
      
      const padding = photoGridConfig.padding;
      const gap = photoGridConfig.gap;
      const photoWidth = (canvasWidth - padding.left - padding.right - gap * (cols - 1)) / cols;
      const photoHeight = (availableHeight - photoGridConfig.marginTop - photoGridConfig.marginBottom - gap * (rows + 1)) / rows;

      // Load all images
      const loadImage = (src: string): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = src;
        });
      };

      const imagePromises = validPhotos.slice(0, photoGridConfig.maxPhotos).map(async (photo, index) => {
        if (photo.cachedImage && photo.cachedImage.complete) {
          return { index, img: photo.cachedImage };
        }
        const img = await loadImage(photo.preview);
        return { index, img };
      });

      const loadedImages = await Promise.all(imagePromises);

      // Draw each photo with white frame
      const imageStyle = photoGridConfig.imageStyle;
      
      loadedImages.forEach(({ index, img }) => {
        if (!img) return;
        
        const row = Math.floor(index / cols);
        const col = index % cols;
        const x = padding.left + col * (photoWidth + gap);
        const y = headerHeight + photoGridConfig.marginTop + gap + row * (photoHeight + gap);
        
        // White frame with shadow
        ctx.save();
        ctx.shadowColor = imageStyle.shadowColor;
        ctx.shadowBlur = imageStyle.shadowBlur;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = imageStyle.shadowOffsetY;
        
        ctx.beginPath();
        ctx.roundRect(
          x - imageStyle.borderWidth, 
          y - imageStyle.borderWidth, 
          photoWidth + imageStyle.borderWidth * 2, 
          photoHeight + imageStyle.borderWidth * 2, 
          imageStyle.borderRadius || 4
        );
        ctx.fillStyle = imageStyle.borderColor;
        ctx.fill();
        ctx.restore();
        
        // Calculate aspect ratio for cover fit
        const imgRatio = img.width / img.height;
        const boxRatio = photoWidth / photoHeight;
        let drawWidth: number, drawHeight: number, drawX: number, drawY: number;
        
        if (imgRatio > boxRatio) {
          drawHeight = photoHeight;
          drawWidth = photoHeight * imgRatio;
          drawX = x - (drawWidth - photoWidth) / 2;
          drawY = y;
        } else {
          drawWidth = photoWidth;
          drawHeight = photoWidth / imgRatio;
          drawX = x;
          drawY = y - (drawHeight - photoHeight) / 2;
        }
        
        // Draw image with rounded corners clip
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(x, y, photoWidth, photoHeight, imageStyle.borderRadius || 12);
        ctx.clip();
        ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
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

  useEffect(() => { loadDrafts(); }, []);
  useEffect(() => { generatePreview(); }, [generatePreview]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-red-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute -bottom-40 right-1/3 w-72 h-72 bg-red-600/10 rounded-full blur-3xl animate-pulse delay-500" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-900/80 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-amber-400 rounded-xl blur-md opacity-75" />
                <img 
                  src="https://www.e-katalog-sop.cloud/sulapfoto_nomg_1.png" 
                  alt="Logo" 
                  className="relative w-12 h-12 rounded-xl shadow-lg object-cover"
                />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                  Laporan WhatsApp Basarnas
                </h1>
                <p className="text-xs text-slate-400 hidden sm:block">
                  Direktorat Kesiapsiagaan • Generator Laporan Otomatis
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDrafts(true)}
                className="hidden sm:flex border-white/20 bg-white/5 hover:bg-white/10 text-white backdrop-blur-sm"
              >
                <Archive className="w-4 h-4 mr-2" />
                Draft ({drafts.length})
              </Button>
              <Button
                size="sm"
                onClick={shareToWhatsApp}
                className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white shadow-lg shadow-green-500/25 transition-all duration-300 hover:scale-105"
              >
                <Send className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Kirim ke WA</span>
                <span className="sm:hidden">Kirim</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 max-w-7xl mx-auto px-4 py-6 w-full">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8 bg-slate-800/50 backdrop-blur-sm border border-white/10 p-1 rounded-xl">
            <TabsTrigger value="editor" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-600 data-[state=active]:to-red-500 data-[state=active]:text-white text-slate-400 rounded-lg transition-all duration-300">
              <FileText className="w-4 h-4 mr-2" />
              Editor
            </TabsTrigger>
            <TabsTrigger value="preview" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-600 data-[state=active]:to-red-500 data-[state=active]:text-white text-slate-400 rounded-lg transition-all duration-300">
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </TabsTrigger>
            <TabsTrigger value="image" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-600 data-[state=active]:to-red-500 data-[state=active]:text-white text-slate-400 rounded-lg transition-all duration-300">
              <Layers className="w-4 h-4 mr-2" />
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
                  <div className="space-y-2">
                    <Label className="text-slate-300 flex items-center gap-2">
                      <span className="text-lg">📍</span> Tempat
                    </Label>
                    <MapLocationPicker
                      value={tempat}
                      onChange={setTempat}
                      onLocationChange={setLocationData}
                      placeholder="Daring melalui zoom meeting"
                    />
                    {/* Map Preview Card in Editor */}
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

          {/* Image Merger Tab */}
          <TabsContent value="image" className="space-y-6">
            {/* Header Input Fields */}
            <Card className="bg-slate-800/50 backdrop-blur-sm border-white/10 shadow-xl">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base text-white flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
                      <span className="text-sm">📝</span>
                    </div>
                    Header Lampiran Foto
                  </CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setPhotoHeaderJudul(judul);
                      setPhotoHeaderTempatTanggal(`${tempat}${tempat && tanggal ? ', ' : ''}${tanggal}`);
                      toast.success("Header disinkronkan dari form!");
                    }}
                    className="border-white/20 bg-white/5 hover:bg-white/10 text-white"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Sync dari Form
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-slate-300">Judul Kegiatan</Label>
                  <Input
                    value={photoHeaderJudul}
                    onChange={(e) => setPhotoHeaderJudul(e.target.value)}
                    placeholder="RAPAT BRIEFING PETUGAS LIAISON OFFICER"
                    className="font-semibold bg-slate-900/50 border-white/10 text-white placeholder:text-slate-500 focus:border-red-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-300">Tempat, Tanggal Bulan Tahun</Label>
                  <Input
                    value={photoHeaderTempatTanggal}
                    onChange={(e) => setPhotoHeaderTempatTanggal(e.target.value)}
                    placeholder="Daring melalui zoom meeting, Rabu 11 Maret 2026"
                    className="bg-slate-900/50 border-white/10 text-white placeholder:text-slate-500 focus:border-red-500"
                  />
                </div>
                
                {/* Title Style Settings */}
                <div className="pt-2 border-t border-white/10 space-y-4">
                  <Label className="text-slate-300 flex items-center gap-2">
                    <Type className="w-4 h-4" />
                    Pengaturan Judul
                  </Label>

                  {/* Live Preview - Draggable Title/Subtitle */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-slate-400 text-sm">Preview Posisi (Geser judul/subtitle)</Label>
                      <div className="flex gap-2 text-xs">
                        <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">Judul</Badge>
                        <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">Subtitle</Badge>
                      </div>
                    </div>
                    <TitlePositionPreview
                      titleX={titleX}
                      titleY={titleY}
                      subtitleX={subtitleX}
                      subtitleY={subtitleY}
                      titleText={photoHeaderJudul || judul || "DOKUMENTASI KEGIATAN"}
                      subtitleText={photoHeaderTempatTanggal || `${tempat}${tempat && tanggal ? ', ' : ''}${tanggal}`}
                      titleFontSize={titleFontSize}
                      subtitleFontSize={subtitleFontSize}
                      titleFontFamily={titleFontFamily}
                      customBackground={customBackground}
                      backgroundBrightness={backgroundBrightness}
                      bgPositionX={bgPositionX}
                      bgPositionY={bgPositionY}
                      bgScale={bgScale}
                      onTitlePositionChange={(x, y) => { setTitleX(x); setTitleY(y); }}
                      onSubtitlePositionChange={(x, y) => { setSubtitleX(x); setSubtitleY(y); }}
                    />
                  </div>

                  {/* Font Size */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-slate-400 text-sm">Ukuran Judul: {titleFontSize}px</Label>
                      <input
                        type="range"
                        min="16"
                        max="48"
                        value={titleFontSize}
                        onChange={(e) => setTitleFontSize(parseInt(e.target.value))}
                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-400 text-sm">Ukuran Subtitle: {subtitleFontSize}px</Label>
                      <input
                        type="range"
                        min="12"
                        max="32"
                        value={subtitleFontSize}
                        onChange={(e) => setSubtitleFontSize(parseInt(e.target.value))}
                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
                      />
                    </div>
                  </div>
                  
                  {/* Font Family */}
                  <div className="space-y-2">
                    <Label className="text-slate-400 text-sm">Jenis Font</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { value: "Arial", label: "Arial" },
                        { value: "Times New Roman", label: "Times" },
                        { value: "Georgia", label: "Georgia" },
                        { value: "Verdana", label: "Verdana" },
                        { value: "Tahoma", label: "Tahoma" },
                        { value: "Courier New", label: "Courier" },
                      ].map((font) => (
                        <Button
                          key={font.value}
                          variant={titleFontFamily === font.value ? "default" : "outline"}
                          size="sm"
                          onClick={() => setTitleFontFamily(font.value as typeof titleFontFamily)}
                          className={titleFontFamily === font.value 
                            ? "bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white border-0" 
                            : "border-white/20 bg-white/5 hover:bg-white/10 text-slate-300"
                          }
                          style={{ fontFamily: font.value }}
                        >
                          {font.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Background Upload */}
            <Card className="bg-slate-800/50 backdrop-blur-sm border-white/10 shadow-xl">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2 text-white">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                      <ImageIcon className="w-4 h-4 text-white" />
                    </div>
                    Background Kustom
                  </CardTitle>
                  {customBackground && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={removeBackground}
                      className="border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Hapus Background
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-blue-500/10 p-3 rounded-lg border border-blue-500/20">
                  <p className="text-blue-300 text-xs">
                    💡 Upload gambar sebagai background lampiran foto. Warna font akan otomatis disesuaikan dengan kecerahan background.
                  </p>
                </div>
                
                {customBackground ? (
                  <div className="space-y-4">
                    <div className="relative group">
                      <img 
                        src={customBackground} 
                        alt="Custom Background" 
                        className="w-full h-40 object-cover rounded-lg border border-white/20"
                      />
                      <div className="absolute bottom-2 left-2 right-2 flex justify-between items-center">
                        <Badge className={` ${backgroundBrightness === 'dark' ? 'bg-slate-800/80 text-white' : 'bg-white/80 text-slate-800'}`}>
                          Mode: {backgroundBrightness === 'dark' ? 'Gelap' : 'Terang'}
                        </Badge>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={removeBackground}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Background Position Adjustment */}
                    <div className="space-y-3 pt-2 border-t border-white/10">
                      <Label className="text-slate-300 flex items-center gap-2">
                        <Layers className="w-4 h-4" />
                        Posisi & Skala Background
                      </Label>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-slate-400 text-sm">Posisi Horizontal: {bgPositionX}%</Label>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={bgPositionX}
                            onChange={(e) => setBgPositionX(parseInt(e.target.value))}
                            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-slate-400 text-sm">Posisi Vertikal: {bgPositionY}%</Label>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={bgPositionY}
                            onChange={(e) => setBgPositionY(parseInt(e.target.value))}
                            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-slate-400 text-sm">Skala (Zoom): {bgScale}%</Label>
                        <input
                          type="range"
                          min="100"
                          max="200"
                          value={bgScale}
                          onChange={(e) => setBgScale(parseInt(e.target.value))}
                          className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                        />
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setBgPositionX(50); setBgPositionY(50); setBgScale(100); }}
                        className="w-full border-white/20 bg-white/5 hover:bg-white/10 text-slate-300"
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Reset Posisi
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div 
                    onClick={() => backgroundInputRef.current?.click()}
                    className="border-2 border-dashed border-white/20 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500/50 hover:bg-blue-500/5 transition-all"
                  >
                    <ImageIcon className="w-12 h-12 text-slate-500 mx-auto mb-3" />
                    <p className="text-slate-400 text-sm">Klik untuk upload background</p>
                    <p className="text-slate-500 text-xs mt-1">PNG, JPG, JPEG (Max 5MB)</p>
                  </div>
                )}
                
                <input
                  ref={backgroundInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.size > 5 * 1024 * 1024) {
                        toast.error("File terlalu besar. Maksimal 5MB");
                        return;
                      }
                      handleBackgroundUpload(file);
                    }
                  }}
                />
              </CardContent>
            </Card>

            {/* Style Options */}
            <Card className="bg-slate-800/50 backdrop-blur-sm border-white/10 shadow-xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-white">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                    <Palette className="w-4 h-4 text-white" />
                  </div>
                  Style Options
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Font Style */}
                <div className="space-y-2">
                  <Label className="text-slate-300 flex items-center gap-2">
                    <Type className="w-4 h-4" /> Font Style
                  </Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {(["modern", "classic", "elegant", "bold"] as const).map((style) => (
                      <Button
                        key={style}
                        variant={fontStyle === style ? "default" : "outline"}
                        size="sm"
                        onClick={() => setFontStyle(style)}
                        className={fontStyle === style 
                          ? "bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white border-0" 
                          : "border-white/20 bg-white/5 hover:bg-white/10 text-slate-300"
                        }
                      >
                        {style.charAt(0).toUpperCase() + style.slice(1)}
                      </Button>
                    ))}
                  </div>
                </div>
                
                {/* Colors */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-300">Header Background Color</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={headerBgColor}
                        onChange={(e) => setHeaderBgColor(e.target.value)}
                        className="w-12 h-10 p-1 cursor-pointer bg-slate-900 border-white/10"
                      />
                      <Input
                        value={headerBgColor}
                        onChange={(e) => setHeaderBgColor(e.target.value)}
                        className="flex-1 bg-slate-900/50 border-white/10 text-white"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Accent Color</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                        className="w-12 h-10 p-1 cursor-pointer bg-slate-900 border-white/10"
                      />
                      <Input
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                        className="flex-1 bg-slate-900/50 border-white/10 text-white"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Color Presets */}
                <div className="space-y-2">
                  <Label className="text-slate-300">Color Presets</Label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { name: "Basarnas", header: "#ffffff", accent: "#c53030", emoji: "🔴" },
                      { name: "Navy Gold", header: "#1e3a5f", accent: "#f59e0b", emoji: "🔵" },
                      { name: "Dark Cyan", header: "#1a1a2e", accent: "#00d9ff", emoji: "🟣" },
                      { name: "Fresh Green", header: "#f0fdf4", accent: "#16a34a", emoji: "🟢" },
                    ].map((preset) => (
                      <Button
                        key={preset.name}
                        variant="outline"
                        size="sm"
                        onClick={() => { setHeaderBgColor(preset.header); setAccentColor(preset.accent); }}
                        className="border-white/20 bg-white/5 hover:bg-white/10 text-slate-300"
                      >
                        {preset.emoji} {preset.name}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Photo Grid */}
            <Card className="bg-slate-800/50 backdrop-blur-sm border-white/10 shadow-xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-white">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
                    <ImageIcon className="w-4 h-4 text-white" />
                  </div>
                  Upload Foto
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {photos.map((photo, index) => (
                    <div
                      key={photo.id}
                      className="relative aspect-square border-2 border-dashed border-white/20 rounded-xl overflow-hidden flex items-center justify-center bg-slate-900/50 hover:border-red-500/50 hover:bg-slate-900/70 transition-all duration-300 cursor-pointer group"
                      onClick={() => fileInputRefs.current[index]?.click()}
                    >
                      {photo.preview ? (
                        <>
                          <img
                            src={photo.preview}
                            alt={`Foto ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <p className="text-white text-sm">Ganti Foto</p>
                          </div>
                          <Button
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2 w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => { e.stopPropagation(); removePhoto(index); }}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </>
                      ) : (
                        <div className="text-center p-4">
                          <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-2">
                            <ImageIcon className="w-6 h-6 text-slate-400" />
                          </div>
                          <p className="text-sm text-slate-400">Foto {index + 1}</p>
                          <p className="text-xs text-slate-500">Klik untuk upload</p>
                        </div>
                      )}
                      <input
                        ref={(el) => { fileInputRefs.current[index] = el; }}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handlePhotoUpload(index, file);
                        }}
                      />
                    </div>
                  ))}
                </div>

                {/* Multi-Select Upload Button */}
                <div className="flex gap-2">
                  <input
                    ref={(el) => { fileInputRefs.current[6] = el; }}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const files = e.target.files;
                      if (files && files.length > 0) handleMultiplePhotoUpload(files);
                    }}
                  />
                  <Button
                    variant="outline"
                    className="flex-1 border-white/20 bg-white/5 hover:bg-white/10 text-white transition-all duration-300 hover:scale-[1.02]"
                    onClick={() => fileInputRefs.current[6]?.click()}
                  >
                    <ImagePlus className="w-4 h-4 mr-2" />
                    Pilih Multiple Foto
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setPhotos(Array(6).fill(null).map(() => ({ id: generateId(), file: null, preview: "" })))}
                    className="border-white/20 bg-white/5 hover:bg-red-500/20 text-slate-300 hover:text-red-400"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Reset
                  </Button>
                </div>

                {/* Merge Button */}
                <Button
                  onClick={mergeImages}
                  disabled={isMerging || !photos.some(p => p.preview)}
                  className="w-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white shadow-lg shadow-red-500/25 transition-all duration-300 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {isMerging ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Memproses...
                    </>
                  ) : (
                    <>
                      <Layers className="w-4 h-4 mr-2" />
                      Gabungkan Foto
                    </>
                  )}
                </Button>

                {/* Hidden Canvas */}
                <canvas ref={canvasRef} className="hidden" />
              </CardContent>
            </Card>

            {/* Merged Image Preview */}
            {mergedImage && (
              <Card className="bg-slate-800/50 backdrop-blur-sm border-white/10 shadow-xl">
                <CardHeader className="bg-gradient-to-r from-green-600/20 to-green-500/10 border-b border-white/10">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-white">
                      <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                      Hasil Gabungan
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={downloadMergedImage} className="border-white/20 bg-white/5 hover:bg-white/10 text-white">
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                      <Button size="sm" onClick={shareToWhatsApp} className="bg-gradient-to-r from-green-600 to-green-500 text-white">
                        <Share2 className="w-4 h-4 mr-2" />
                        Share ke WA
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="rounded-xl overflow-hidden border border-white/10 shadow-2xl">
                    <img src={mergedImage} alt="Merged" className="w-full max-w-md mx-auto" />
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

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
      <footer className="bg-slate-900/80 backdrop-blur-sm border-t border-white/10 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-semibold">Basarnas</span>
          </div>
          <p className="text-slate-400 text-sm">
            © 2024 Laporan WhatsApp Basarnas - Direktorat Kesiapsiagaan
          </p>
        </div>
      </footer>
    </main>
  );
}
