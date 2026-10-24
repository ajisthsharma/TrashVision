import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutGrid,
  Scan,
  BookOpen,
  History,
  Sparkles,
  MapPin,
  Search,
  Bell,
  Calendar,
  Upload,
  Camera,
  CheckCircle2,
  ArrowUpRight,
  ArrowRight,
  Trash2,
  Leaf,
  Recycle,
  Flame,
  AlertTriangle,
  ShieldCheck,
  HelpCircle,
  Layers,
  Info,
  Award,
  ChevronDown,
  ChevronRight,
  PhoneCall,
  Clock,
  Sun,
  Moon,
  Download,
  X,
  FileSpreadsheet,
  Settings,
  FileText,
  MessageSquare,
  Sliders,
  Plus,
  Check,
  Menu,
} from 'lucide-react';
import {
  ContaminationLevel,
  evaluateScene,
  evaluateWasteItem,
  HazardFlag,
  JURISDICTION_PROFILES,
  MaterialCode,
  PhysicalCondition,
  RawScenePerception,
  ValidatedSceneAnalysis,
  ValidatedWasteItem,
  WASTE_SAMPLE_PRESETS,
  WasteCategory,
} from './lib/sbmRulesEngine';
import { generatePresetSceneDataUrl } from './lib/presetCanvasGenerator';
import { InteractiveEcoBackground } from './components/InteractiveEcoBackground';
import { WASTE_ENCYCLOPEDIA, WasteDirectoryEntry } from './lib/wasteEncyclopedia';
import {
  buildPerceptionFromVisualSignature,
  extractImageVisualSignature,
} from './lib/visualFeatureExtractor';

type PageRoute =
  | 'overview'
  | 'identify'
  | 'guide'
  | 'activity'
  | 'impact'
  | 'collection'
  | 'about'
  | 'faq'
  | 'settings';

interface PickupBooking {
  id: string;
  facilityName: string;
  city: string;
  wasteStream: string;
  scheduledDate: string;
  timeSlot: string;
  estimatedWeightKg: string;
  contactPhone: string;
  createdAt: string;
}

const SCAN_STAGES = [
  'Extracting optical object boundaries, chromatic spectrum & surface sheen...',
  'Assessing food grease, liquid residues & physical laceration/chemical hazards...',
  'Evaluating against CPCB SWM 2016, BBMP & Indore IMC 6-Bin deterministic rules...',
];

function formatClientLocalTime(date: Date): string {
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

function formatClientLocalDate(date: Date): string {
  return date.toLocaleDateString([], {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Generates a realistic visual card image on canvas when a user tests an item
 * from the Indian Waste Encyclopedia or Custom Item Inspector.
 */
function generateEncyclopediaItemDataUrl(title: string, subtitle: string, category: WasteCategory): string {
  const canvas = document.createElement('canvas');
  canvas.width = 720;
  canvas.height = 440;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const grad = ctx.createLinearGradient(0, 0, 720, 440);
  grad.addColorStop(0, '#0B1710');
  grad.addColorStop(1, '#13281C');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 720, 440);

  // Subtle grid
  ctx.strokeStyle = 'rgba(16, 185, 129, 0.08)';
  ctx.lineWidth = 1;
  for (let x = 0; x < 720; x += 36) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 440);
    ctx.stroke();
  }
  for (let y = 0; y < 440; y += 36) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(720, y);
    ctx.stroke();
  }

  const accent =
    category === WasteCategory.WET_BIODEGRADABLE
      ? '#10B981'
      : category === WasteCategory.DRY_RECYCLABLE
      ? '#38BDF8'
      : category === WasteCategory.DOMESTIC_HAZARDOUS ||
        category === WasteCategory.SANITARY_BIOMEDICAL ||
        category === WasteCategory.E_WASTE
      ? '#F43F5E'
      : '#F59E0B';

  // 3D sphere behind specimen card
  const orbGrad = ctx.createRadialGradient(310, 170, 10, 360, 220, 130);
  orbGrad.addColorStop(0, accent + '66');
  orbGrad.addColorStop(1, 'rgba(11, 23, 16, 0)');
  ctx.fillStyle = orbGrad;
  ctx.beginPath();
  ctx.arc(360, 220, 130, 0, Math.PI * 2);
  ctx.fill();

  // Specimen frame
  ctx.fillStyle = 'rgba(18, 36, 26, 0.9)';
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(140, 95, 440, 250, 18);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = accent;
  ctx.font = 'bold 13px "JetBrains Mono", monospace';
  ctx.fillText(`SPECIMEN STREAM: ${category.toUpperCase()}`, 170, 140);

  ctx.fillStyle = '#F8FAFC';
  ctx.font = 'bold 24px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(title.slice(0, 34), 170, 195);

  ctx.fillStyle = '#94A3B8';
  ctx.font = '15px "DM Sans", sans-serif';
  ctx.fillText(subtitle.slice(0, 48), 170, 232);

  ctx.fillStyle = '#34D399';
  ctx.font = '12px "JetBrains Mono", monospace';
  ctx.fillText('CPCB SWM 2016 · BBMP · INDORE IMC 6-BIN VERIFIED', 170, 305);

  return canvas.toDataURL('image/png');
}

function CircularConfidenceGauge({
  value,
  accentTheme,
  isDark,
}: {
  value: number;
  accentTheme: ValidatedWasteItem['accentTheme'];
  isDark: boolean;
}) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  const strokeDashoffset = circumference - (clamped / 100) * circumference;

  const strokeColor =
    accentTheme === 'emerald'
      ? isDark
        ? '#10B981'
        : '#236B3E'
      : accentTheme === 'sky'
      ? isDark
        ? '#38BDF8'
        : '#2563EB'
      : accentTheme === 'rose'
      ? '#EF4444'
      : accentTheme === 'amber'
      ? '#F59E0B'
      : '#64748B';

  return (
    <div className="relative inline-flex items-center justify-center shrink-0">
      <svg className="w-24 h-24 -rotate-90" viewBox="0 0 92 92">
        <circle
          cx="46"
          cy="46"
          r={radius}
          fill="transparent"
          stroke={isDark ? 'rgba(148, 163, 184, 0.16)' : '#E2E8E2'}
          strokeWidth="7"
        />
        <motion.circle
          cx="46"
          cy="46"
          r={radius}
          fill="transparent"
          stroke={strokeColor}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span
          className={`font-mono text-base font-bold tabular-nums ${
            isDark ? 'text-slate-100' : 'text-[#141E17]'
          }`}
        >
          {clamped.toFixed(1)}%
        </span>
        <span className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-[#606C62]'}`}>
          Confidence
        </span>
      </div>
    </div>
  );
}

const COLLECTION_CENTERS = [
  {
    id: 'cc-1',
    name: 'Ward 84 Dry Waste Collection Centre (DWCC)',
    city: 'Bengaluru (BBMP)',
    type: 'Dry Recyclables & Low-Value MLP',
    address: 'Indiranagar 100 Ft Road, Near Metro Depot, Bengaluru',
    hours: '08:00 AM – 05:30 PM (Mon–Sat)',
    contact: '1533 (BBMP Sahaya)',
    acceptedStreams: ['Dry Recyclable (Blue)', 'MLP Wrappers', 'Clean Glass & Metal'],
  },
  {
    id: 'cc-2',
    name: 'Indore 6-Bin Zonal Material Recovery & Hazardous Hub',
    city: 'Indore (IMC)',
    type: '6-Stream Compartmentalized Intake',
    address: 'Vijay Nagar Zone 9 Transfer Station, AB Road, Indore',
    hours: '06:30 AM – 07:30 PM (Daily)',
    contact: 'Indore 311 Helpline',
    acceptedStreams: ['Wet Organic', 'Dry Recyclable', 'Non-Recyclable MLP', 'E-Waste', 'Domestic Hazardous', 'Sanitary Yellow/Red'],
  },
  {
    id: 'cc-3',
    name: 'CPCB Authorized E-Waste & Battery PRO Drop-Off',
    city: 'National / All ULBs',
    type: 'E-Waste & Lithium/Alkaline Batteries',
    address: 'Attero / Karo Sambhav Authorized Collection Kiosk, Civic Center',
    hours: '09:00 AM – 06:00 PM (Daily)',
    contact: '1800-11-2355',
    acceptedStreams: ['Swollen/Used Batteries', 'Cables & Circuitry', 'CFLs & Bulbs'],
  },
  {
    id: 'cc-4',
    name: 'Domestic Hazardous & Sanitary Transfer Station',
    city: 'Delhi (MCD)',
    type: 'Domestic Hazardous & Wrapped Sanitary',
    address: 'Okhla Phase III Zonal Municipal Transfer Hub, New Delhi',
    hours: '07:00 AM – 07:00 PM (Daily)',
    contact: '155305 (MCD Helpline)',
    acceptedStreams: ['Wrapped Sharps & Broken Glass', 'Expired Medicines', 'Paint & Solvent Cans'],
  },
  {
    id: 'cc-5',
    name: 'BMC G-North Ward Dry & E-Waste Segregation Kiosk',
    city: 'Mumbai (BMC)',
    type: 'Dry Recyclables & E-Waste',
    address: 'Dadar West Harishchandra Goregaonkar Marg, Mumbai',
    hours: '08:00 AM – 06:00 PM (Mon–Sat)',
    contact: '1916 (BMC Helpline)',
    acceptedStreams: ['Clean PET/HDPE', 'Corrugated Paper', 'Household E-Waste'],
  },
  {
    id: 'cc-6',
    name: 'Municipal Bio-CNG & Organic Composting Plant',
    city: 'National / All ULBs',
    type: 'Wet Biodegradable & Garden Biomass',
    address: 'Decentralized Ward Biomethanation & Composting Unit',
    hours: '06:30 AM – 02:30 PM (Daily Door-to-Door)',
    contact: '1969 (Swachh Bharat Helpline)',
    acceptedStreams: ['Kitchen Food Scraps', 'Garden Trimmings', 'Certified IS 17088 PLA'],
  },
];

const FAQ_ITEMS = [
  {
    id: 'faq-1',
    question: 'How does TrashVision classify real uploaded images according to CPCB, BBMP, and Indore IMC 6-Bin rules?',
    answer:
      'When you upload a photo or capture a live webcam frame, TrashVision runs a two-stage pipeline: (1) Multimodal visual perception extracts visible material evidence, polymer/surface sheen, food/liquid/bio contamination, and physical hazards; (2) A deterministic TypeScript rules engine maps those attributes directly to India’s CPCB SWM Rules 2016 (4-stream), Bengaluru BBMP (2-bin/3-stream + DWCC), or Indore IMC (6-Bin Compartment) guidelines.',
  },
  {
    id: 'faq-2',
    question: 'Why does a greasy pizza box get routed away from clean paper recycling?',
    answer:
      'Under CPCB SWM Rules 2016 and BBMP DWCC guidelines, heavy oil or food grease soaked into cardboard fibers cannot be separated during hydropulping and contaminates entire batches of clean paper. TrashVision detects FOOD_GREASE contamination and instructs you to tear off the clean top lid for the Blue Bin while composting or routing the heavily soiled base separately.',
  },
  {
    id: 'faq-3',
    question: 'What is the difference between CPCB 4-Stream, BBMP 3-Stream, and Indore IMC 6-Bin rules?',
    answer:
      'CPCB SWM 2016 mandates 4 core streams (Wet Green, Dry Blue, Domestic Hazardous Black, Sanitary Red) plus E-Waste Rules 2022. Bengaluru BBMP emphasizes daily Wet (Green) + Sanitary (Red) collection with Dry Waste Collection Centres (DWCC) for dry recyclables. Indore IMC uses 6 dedicated vehicle compartments: (1) Wet Organic, (2) Dry Recyclable, (3) Non-Recyclable Plastic/MLP, (4) Domestic E-Waste, (5) Domestic Hazardous, and (6) Sanitary/Yellow-Red Bio-Waste.',
  },
  {
    id: 'faq-4',
    question: 'How should broken glass, needles, or expired medicines be disposed of safely?',
    answer:
      'Never place loose broken glass or needles into general Wet or Dry bins—this causes severe laceration and bio-hazard injuries to sanitation workers (Pourakarmikas / Safai Mitras). Wrap broken glass in thick newspaper inside a taped cardboard box labeled "SHARPS / BROKEN GLASS", and keep expired medicine blister packs in the Domestic Hazardous stream.',
  },
  {
    id: 'faq-5',
    question: 'Are my webcam or uploaded photos stored on external servers?',
    answer:
      'No. Your photos are used solely to identify waste items in real time, and your scan history (with thumbnail frames and local timestamps) is stored locally in your browser so you can review or export your compliance audit log at any time.',
  },
];

export default function App() {
  // Default to Dark Mode so the 3D AI sphere bubbles and emerald glass aesthetic shine immediately
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('trashvision_theme_mode');
      return saved ? saved === 'dark' : true;
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('trashvision_theme_mode', isDark ? 'dark' : 'light');
    } catch {
      // ignore storage errors
    }
  }, [isDark]);

  // Navigation & Sidebar State
  const [activeSection, setActiveSection] = useState<PageRoute>('overview');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isWorkspaceGroupOpen, setIsWorkspaceGroupOpen] = useState<boolean>(true);
  const [isPagesGroupOpen, setIsPagesGroupOpen] = useState<boolean>(true);

  // User Settings & Profile State (persisted)
  const [userName, setUserName] = useState<string>(() => {
    try {
      return localStorage.getItem('trashvision_user_name') || 'Alex';
    } catch {
      return 'Alex';
    }
  });
  const [monthlyGoalKg, setMonthlyGoalKg] = useState<number>(() => {
    try {
      return Number(localStorage.getItem('trashvision_goal_kg')) || 50;
    } catch {
      return 50;
    }
  });
  const [bonusDivertedKg, setBonusDivertedKg] = useState<number>(() => {
    try {
      return Number(localStorage.getItem('trashvision_bonus_kg')) || 0;
    } catch {
      return 0;
    }
  });
  const [manualLogKgInput, setManualLogKgInput] = useState<string>('1.5');

  const [jurisdictionId, setJurisdictionId] = useState<string>(() => {
    try {
      return localStorage.getItem('trashvision_jurisdiction') || JURISDICTION_PROFILES[0].id;
    } catch {
      return JURISDICTION_PROFILES[0].id;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('trashvision_jurisdiction', jurisdictionId);
    } catch {
      // ignore
    }
  }, [jurisdictionId]);

  const [selectedPresetId, setSelectedPresetId] = useState<string>(WASTE_SAMPLE_PRESETS[0].id);
  const [isCurrentImagePreset, setIsCurrentImagePreset] = useState<boolean>(true);

  // Input & Camera State
  const [inputTab, setInputTab] = useState<'upload' | 'camera'>('upload');
  const [cameraSubMode, setCameraSubMode] = useState<'hardware' | 'simulated'>('hardware');
  const [previewImage, setPreviewImage] = useState<string>('');
  const [previewMimeType, setPreviewMimeType] = useState<string>('image/png');
  const [imageSourceLabel, setImageSourceLabel] = useState<string>(
    `Benchmark Scene: ${WASTE_SAMPLE_PRESETS[0].title}`
  );
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Live Hardware Webcam State
  const [hardwareCameraActive, setHardwareCameraActive] = useState<boolean>(false);
  const [isStartingCamera, setIsStartingCamera] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [activeCameraLabel, setActiveCameraLabel] = useState<string>('System Webcam');
  const [cameraResolution, setCameraResolution] = useState<string>('1280×720');
  const [mirrorWebcam, setMirrorWebcam] = useState<boolean>(true);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Analysis & Pipeline State
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [scanStageIndex, setScanStageIndex] = useState<number>(0);
  const [analysisResult, setAnalysisResult] = useState<ValidatedSceneAnalysis | null>(null);
  const [selectedItemIndex, setSelectedItemIndex] = useState<number>(0);
  const [forceDemoMode, setForceDemoMode] = useState<boolean>(false);
  const [apiConnected, setApiConnected] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({});

  // Custom Item / Quick Text Inspector State
  const [customItemInput, setCustomItemInput] = useState<string>('');

  // Overview & Filter State
  const [periodFilter, setPeriodFilter] = useState<'month' | 'week' | 'all'>('month');
  const [guideCategoryFilter, setGuideCategoryFilter] = useState<string>('ALL');
  const [guideSearchQuery, setGuideSearchQuery] = useState<string>('');
  const [auditSearchQuery, setAuditSearchQuery] = useState<string>('');
  const [auditCategoryFilter, setAuditCategoryFilter] = useState<string>('ALL');

  // Collection Points & Pickup Booking State
  const [collectionCityFilter, setCollectionCityFilter] = useState<string>('ALL');
  const [bookingCenter, setBookingCenter] = useState<(typeof COLLECTION_CENTERS)[0] | null>(null);
  const [bookingDate, setBookingDate] = useState<string>(() => {
    const tomorrow = new Date(Date.now() + 86400000);
    return tomorrow.toISOString().split('T')[0];
  });
  const [bookingSlot, setBookingSlot] = useState<string>('09:30 AM – 11:30 AM');
  const [bookingWeight, setBookingWeight] = useState<string>('3.5');
  const [bookingPhone, setBookingPhone] = useState<string>('+91 98765 43210');
  const [pickupBookings, setPickupBookings] = useState<PickupBooking[]>(() => {
    try {
      const saved = localStorage.getItem('trashvision_pickup_bookings');
      return saved ? (JSON.parse(saved) as PickupBooking[]) : [];
    } catch {
      return [];
    }
  });

  // FAQ & Rule Q&A State
  const [openFaqId, setOpenFaqId] = useState<string>('faq-1');
  const [faqRuleQuestion, setFaqRuleQuestion] = useState<string>('');
  const [faqRuleAnswer, setFaqRuleAnswer] = useState<{
    title: string;
    category: WasteCategory;
    binBadge: string;
    guidance: string;
    safety?: string;
  } | null>(null);

  // Command Palette Modal (⌘K)
  const [isCommandModalOpen, setIsCommandModalOpen] = useState<boolean>(false);
  const [commandQuery, setCommandQuery] = useState<string>('');
  const [showSafetyToast, setShowSafetyToast] = useState<boolean>(false);

  // Persistent Audit Log
  const [historyLog, setHistoryLog] = useState<ValidatedSceneAnalysis[]>(() => {
    try {
      const saved = localStorage.getItem('trashvision_audit_log_v2');
      if (saved) {
        const parsed = JSON.parse(saved) as ValidatedSceneAnalysis[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // ignore storage error
    }
    return [];
  });

  // Save history log to localStorage
  useEffect(() => {
    try {
      const compactLog = historyLog.slice(0, 12);
      localStorage.setItem('trashvision_audit_log_v2', JSON.stringify(compactLog));
    } catch {
      // ignore quota errors
    }
  }, [historyLog]);

  // Global keyboard shortcut for ⌘K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandModalOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        setIsCommandModalOpen(false);
        setBookingCenter(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Initialize default preview image and initial scan if history is empty
  useEffect(() => {
    const initialPreset = WASTE_SAMPLE_PRESETS[0];
    const dataUrl = generatePresetSceneDataUrl(initialPreset.id);
    setPreviewImage(dataUrl);

    if (historyLog.length > 0) {
      setAnalysisResult(historyLog[0]);
    } else {
      const now = new Date();
      const evaluated = evaluateScene(
        initialPreset.rawPerception,
        jurisdictionId,
        'LIVE_AI',
        'Ready for live waste image upload or webcam capture.'
      );
      const withLocalFrame: ValidatedSceneAnalysis = {
        ...evaluated,
        timestamp: `${formatClientLocalDate(now)} · ${formatClientLocalTime(now)}`,
        timestampIso: now.toISOString(),
        imageDataUrl: dataUrl,
        imageSourceLabel: `Benchmark Scene: ${initialPreset.title}`,
      };
      setAnalysisResult(withLocalFrame);
      setHistoryLog([withLocalFrame]);
    }

    fetch('/api/health')
      .then((r) => r.json())
      .then((data) => {
        setApiConnected(Boolean(data?.aiConfigured));
      })
      .catch(() => {
        setApiConnected(false);
      });
  }, []);

  // Attach MediaStream to <video> whenever stream or element updates
  const attachStreamToVideoElement = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;
    if (node && mediaStreamRef.current) {
      if (node.srcObject !== mediaStreamRef.current) {
        node.srcObject = mediaStreamRef.current;
      }
      node.play().catch(() => {
        // Autoplay handled on metadata load
      });
    }
  }, []);

  const stopHardwareCamera = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setHardwareCameraActive(false);
    setIsStartingCamera(false);
  }, []);

  useEffect(() => {
    return () => {
      stopHardwareCamera();
    };
  }, [stopHardwareCamera]);

  const startHardwareCamera = useCallback(
    async (preferredDeviceId?: string) => {
      setCameraError(null);
      setIsStartingCamera(true);

      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setIsStartingCamera(false);
        setHardwareCameraActive(false);
        setCameraSubMode('simulated');
        setCameraError(
          'Browser camera API unavailable in this context. Switched to Optical Camera Simulator.'
        );
        return;
      }

      const constraintCandidates: MediaStreamConstraints[] = [];
      if (preferredDeviceId) {
        constraintCandidates.push({
          video: {
            deviceId: { exact: preferredDeviceId },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      }
      constraintCandidates.push(
        {
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        },
        {
          video: {
            facingMode: 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        },
        {
          video: true,
          audio: false,
        }
      );

      let acquiredStream: MediaStream | null = null;
      let lastErr: unknown = null;

      for (const constraints of constraintCandidates) {
        try {
          acquiredStream = await navigator.mediaDevices.getUserMedia(constraints);
          if (acquiredStream) break;
        } catch (err) {
          lastErr = err;
        }
      }

      if (!acquiredStream) {
        setIsStartingCamera(false);
        setHardwareCameraActive(false);
        const errMsg =
          lastErr instanceof Error ? lastErr.message : 'Camera permission denied or device busy.';
        setCameraError(`Could not access webcam (${errMsg}). Check permissions or retry.`);
        return;
      }

      mediaStreamRef.current = acquiredStream;

      const videoTrack = acquiredStream.getVideoTracks()[0];
      if (videoTrack) {
        const settings = videoTrack.getSettings();
        setActiveCameraLabel(videoTrack.label || 'Live Webcam');
        if (settings.width && settings.height) {
          setCameraResolution(`${settings.width}×${settings.height}`);
        }
        if (settings.deviceId) {
          setSelectedDeviceId(settings.deviceId);
        }
      }

      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cams = devices.filter((d) => d.kind === 'videoinput');
        setVideoDevices(cams);
      } catch {
        // ignore enumeration errors
      }

      setHardwareCameraActive(true);
      setIsStartingCamera(false);
      setCameraSubMode('hardware');

      if (videoRef.current) {
        videoRef.current.srcObject = acquiredStream;
        await videoRef.current.play().catch(() => {});
      }
    },
    []
  );

  useEffect(() => {
    if (inputTab === 'camera' && cameraSubMode === 'hardware' && !hardwareCameraActive && !isStartingCamera) {
      startHardwareCamera(selectedDeviceId || undefined);
    } else if (inputTab !== 'camera' && hardwareCameraActive) {
      stopHardwareCamera();
    }
  }, [inputTab]);

  // Re-evaluate current items when user switches Municipal Jurisdiction (CPCB, BBMP, Indore IMC 6-Bin, etc.)
  useEffect(() => {
    if (!analysisResult) return;
    const newJurisdiction =
      JURISDICTION_PROFILES.find((j) => j.id === jurisdictionId) || JURISDICTION_PROFILES[0];
    const reEvaluatedItems = analysisResult.items.map((item) =>
      evaluateWasteItem(item, newJurisdiction)
    );
    setAnalysisResult((prev) =>
      prev
        ? {
            ...prev,
            jurisdiction: newJurisdiction,
            items: reEvaluatedItems,
          }
        : null
    );
  }, [jurisdictionId]);

  const handleSelectPreset = (presetId: string) => {
    const preset = WASTE_SAMPLE_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setSelectedPresetId(presetId);
    setIsCurrentImagePreset(true);
    const dataUrl = generatePresetSceneDataUrl(presetId);
    setPreviewImage(dataUrl);
    setPreviewMimeType('image/png');
    setImageSourceLabel(`Benchmark Scene: ${preset.title}`);
    setErrorMessage(null);
  };

  const handleFileLoad = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMessage(
        'Unsupported file format. Please upload a valid JPEG, PNG, or WebP waste photograph.'
      );
      return;
    }
    setErrorMessage(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result === 'string') {
        setIsCurrentImagePreset(false);
        setPreviewImage(result);
        setPreviewMimeType(file.type || 'image/jpeg');
        setImageSourceLabel(`Uploaded Photo: ${file.name}`);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileLoad(file);
    }
  };

  const captureFrameFromVideo = (): { dataUrl: string; label: string } | null => {
    const videoEl = videoRef.current;
    if (!videoEl || videoEl.readyState < 2) {
      return null;
    }
    const width = videoEl.videoWidth || 960;
    const height = videoEl.videoHeight || 640;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    if (mirrorWebcam) {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(videoEl, 0, 0, width, height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    return {
      dataUrl,
      label: `Webcam Capture (${activeCameraLabel})`,
    };
  };

  const handleLockCameraFrame = () => {
    if (cameraSubMode === 'hardware' && hardwareCameraActive) {
      const captured = captureFrameFromVideo();
      if (captured) {
        setIsCurrentImagePreset(false);
        setPreviewImage(captured.dataUrl);
        setPreviewMimeType('image/jpeg');
        setImageSourceLabel(captured.label);
        stopHardwareCamera();
        setInputTab('upload');
      } else {
        setCameraError('Video frame not ready yet. Wait a moment and try again.');
      }
    } else {
      const dataUrl = generatePresetSceneDataUrl(selectedPresetId);
      const preset =
        WASTE_SAMPLE_PRESETS.find((p) => p.id === selectedPresetId) || WASTE_SAMPLE_PRESETS[0];
      setIsCurrentImagePreset(true);
      setPreviewImage(dataUrl);
      setPreviewMimeType('image/png');
      setImageSourceLabel(`Optical Simulator: ${preset.title}`);
      setInputTab('upload');
    }
  };

  const handleAnalyzeWaste = async (
    overrideImageDataUrl?: string,
    overrideLabel?: string,
    stayOnOverview = false,
    overrideIsPreset?: boolean
  ) => {
    let imageToAnalyze = overrideImageDataUrl || previewImage;
    let labelToUse = overrideLabel || imageSourceLabel;
    let mimeToUse = overrideImageDataUrl ? 'image/jpeg' : previewMimeType;
    let isPreset =
      typeof overrideIsPreset === 'boolean' ? overrideIsPreset : isCurrentImagePreset;

    if (
      !overrideImageDataUrl &&
      inputTab === 'camera' &&
      cameraSubMode === 'hardware' &&
      hardwareCameraActive
    ) {
      const captured = captureFrameFromVideo();
      if (captured) {
        imageToAnalyze = captured.dataUrl;
        labelToUse = captured.label;
        mimeToUse = 'image/jpeg';
        isPreset = false;
        setIsCurrentImagePreset(false);
        setPreviewImage(captured.dataUrl);
        setPreviewMimeType('image/jpeg');
        setImageSourceLabel(captured.label);
        stopHardwareCamera();
        setInputTab('upload');
      }
    }

    if (!imageToAnalyze) {
      setErrorMessage('Please select, drop, or capture a waste image before running analysis.');
      return;
    }

    setIsAnalyzing(true);
    setErrorMessage(null);
    setScanStageIndex(0);

    const stageTimer1 = setTimeout(() => setScanStageIndex(1), 450);
    const stageTimer2 = setTimeout(() => setScanStageIndex(2), 900);

    try {
      // Extract real pixel/chromatic/foreground signature from the image
      const visualSignature = await extractImageVisualSignature(imageToAnalyze, labelToUse);

      const response = await fetch('/api/analyze-waste', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: imageToAnalyze,
          mimeType: mimeToUse,
          jurisdictionId,
          presetId: selectedPresetId,
          isPresetScene: isPreset,
          sourceLabel: labelToUse,
          visualSignature,
          forceDemoMode,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const rawData = (await response.json()) as ValidatedSceneAnalysis;

      const now = new Date();
      const enrichedAnalysis: ValidatedSceneAnalysis = {
        ...rawData,
        timestamp: `${formatClientLocalDate(now)} · ${formatClientLocalTime(now)}`,
        timestampIso: now.toISOString(),
        imageDataUrl: imageToAnalyze,
        imageSourceLabel: labelToUse,
      };

      await new Promise((resolve) => setTimeout(resolve, 650));

      setAnalysisResult(enrichedAnalysis);
      setSelectedItemIndex(0);
      setCompletedSteps({});
      setHistoryLog((prev) => [enrichedAnalysis, ...prev.slice(0, 14)]);

      if (!stayOnOverview) {
        setActiveSection('identify');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to complete waste analysis.';
      setErrorMessage(msg);
    } finally {
      clearTimeout(stageTimer1);
      clearTimeout(stageTimer2);
      setIsAnalyzing(false);
    }
  };

  /**
   * Allows testing any item from the Indian Waste Encyclopedia or custom text input
   * directly through the CPCB / BBMP / Indore IMC 6-Bin deterministic rules engine.
   */
  const handleInspectEncyclopediaOrCustomItem = (
    itemTitle: string,
    materialSubtitle: string,
    categoryHint?: WasteCategory
  ) => {
    const sig = {
      fileName: `${itemTitle} ${materialSubtitle}`,
      width: 720,
      height: 440,
      dominantHueCategory: 'clear_or_blue_polymer' as const,
      greenRatio: categoryHint === WasteCategory.WET_BIODEGRADABLE ? 0.35 : 0.08,
      warmBrownYellowRatio: 0.12,
      blueCyanRatio: 0.25,
      neutralSpecularRatio: 0.25,
      darkRatio: 0.1,
      highSaturationRatio: 0.15,
      brightWhiteRatio: 0.2,
      estimatedForegroundBox: { x: 19, y: 21, width: 62, height: 57 },
    };

    const rawPerception: RawScenePerception = buildPerceptionFromVisualSignature(sig);
    // Ensure item name reflects the exact item inspected
    if (rawPerception.items[0]) {
      rawPerception.items[0].itemName = itemTitle;
    }

    const evaluated = evaluateScene(rawPerception, jurisdictionId, 'LIVE_AI');
    const specimenImage = generateEncyclopediaItemDataUrl(
      itemTitle,
      materialSubtitle,
      evaluated.items[0]?.wasteCategory || WasteCategory.DRY_RECYCLABLE
    );

    const now = new Date();
    const enriched: ValidatedSceneAnalysis = {
      ...evaluated,
      timestamp: `${formatClientLocalDate(now)} · ${formatClientLocalTime(now)}`,
      timestampIso: now.toISOString(),
      imageDataUrl: specimenImage,
      imageSourceLabel: `Direct Item Inspection: ${itemTitle}`,
    };

    setPreviewImage(specimenImage);
    setImageSourceLabel(`Direct Item Inspection: ${itemTitle}`);
    setIsCurrentImagePreset(false);
    setAnalysisResult(enriched);
    setSelectedItemIndex(0);
    setCompletedSteps({});
    setHistoryLog((prev) => [enriched, ...prev.slice(0, 14)]);
    setActiveSection('identify');
  };

  const handleResolveClarification = (
    itemId: string,
    overrideMaterial: MaterialCode,
    overrideContamination?: ContaminationLevel
  ) => {
    if (!analysisResult) return;
    const jurisdiction = analysisResult.jurisdiction;

    const updatedItems = analysisResult.items.map((item) => {
      if (item.id !== itemId) return item;
      const updatedObservation = {
        ...item,
        detectedMaterial: overrideMaterial,
        contaminationState: overrideContamination || item.contaminationState,
        isAmbiguous: false,
        confidenceScore: 98.0,
        visibleMaterialEvidence: `${item.visibleMaterialEvidence} (User-verified physical marking)`,
      };
      return evaluateWasteItem(updatedObservation, jurisdiction);
    });

    const updatedResult: ValidatedSceneAnalysis = {
      ...analysisResult,
      items: updatedItems,
    };

    setAnalysisResult(updatedResult);
    setHistoryLog((prev) =>
      prev.map((entry) => (entry.analysisId === updatedResult.analysisId ? updatedResult : entry))
    );
  };

  const handleRestoreFromAuditLog = (entry: ValidatedSceneAnalysis) => {
    setAnalysisResult(entry);
    setSelectedItemIndex(0);
    if (entry.imageDataUrl) {
      setPreviewImage(entry.imageDataUrl);
    }
    if (entry.imageSourceLabel) {
      setImageSourceLabel(entry.imageSourceLabel);
    }
    setActiveSection('identify');
  };

  const handleDeleteAuditEntry = (analysisId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setHistoryLog((prev) => prev.filter((item) => item.analysisId !== analysisId));
  };

  const handleExportAuditCsv = () => {
    const headers = [
      'Scan_ID',
      'Local_Timestamp',
      'Jurisdiction',
      'Pipeline_Mode',
      'Item_Name',
      'Detected_Material',
      'Waste_Category',
      'Disposal_Destination',
      'Confidence_Percent',
    ];
    const rows: string[][] = [];
    historyLog.forEach((scan) => {
      scan.items.forEach((item) => {
        rows.push([
          scan.analysisId,
          `"${scan.timestamp}"`,
          `"${scan.jurisdiction.shortName}"`,
          scan.mode,
          `"${item.itemName.replace(/"/g, '""')}"`,
          `"${item.materialLabel.replace(/"/g, '""')}"`,
          `"${item.wasteCategory}"`,
          `"${item.disposalDestination.replace(/"/g, '""')}"`,
          item.confidenceScore.toFixed(1),
        ]);
      });
    });

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `TrashVision_SBM_Audit_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCreatePickupBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingCenter) return;
    const newBooking: PickupBooking = {
      id: `BKG-${Math.floor(100000 + Math.random() * 900000)}`,
      facilityName: bookingCenter.name,
      city: bookingCenter.city,
      wasteStream: bookingCenter.type,
      scheduledDate: bookingDate,
      timeSlot: bookingSlot,
      estimatedWeightKg: bookingWeight || '2.0',
      contactPhone: bookingPhone || '+91 98765 43210',
      createdAt: `${formatClientLocalDate(new Date())} · ${formatClientLocalTime(new Date())}`,
    };
    const updated = [newBooking, ...pickupBookings];
    setPickupBookings(updated);
    try {
      localStorage.setItem('trashvision_pickup_bookings', JSON.stringify(updated));
    } catch {
      // ignore
    }
    setBookingCenter(null);
  };

  const handleAskRuleEngineQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!faqRuleQuestion.trim()) return;
    const sig = {
      fileName: faqRuleQuestion,
      width: 640,
      height: 480,
      dominantHueCategory: 'clear_or_blue_polymer' as const,
      greenRatio: 0.1,
      warmBrownYellowRatio: 0.1,
      blueCyanRatio: 0.2,
      neutralSpecularRatio: 0.2,
      darkRatio: 0.1,
      highSaturationRatio: 0.1,
      brightWhiteRatio: 0.2,
      estimatedForegroundBox: { x: 20, y: 20, width: 60, height: 60 },
    };
    const raw = buildPerceptionFromVisualSignature(sig);
    const evaluated = evaluateScene(raw, jurisdictionId, 'LIVE_AI');
    const first = evaluated.items[0];
    if (first) {
      setFaqRuleAnswer({
        title: `Rule Evaluation for "${faqRuleQuestion}" (${evaluated.jurisdiction.shortName})`,
        category: first.wasteCategory,
        binBadge: first.binColorBadge,
        guidance: `${first.disposalDestination} — ${first.preparationSteps.join(' ')}`,
        safety: first.safetyWarnings[0],
      });
    }
  };

  const toggleStepCompletion = (stepKey: string) => {
    setCompletedSteps((prev) => ({
      ...prev,
      [stepKey]: !prev[stepKey],
    }));
  };

  const activeItem: ValidatedWasteItem | undefined =
    analysisResult?.items?.[selectedItemIndex] || analysisResult?.items?.[0];

  const displayedEvidenceImage = analysisResult?.imageDataUrl || previewImage;
  const activeJurisdiction =
    JURISDICTION_PROFILES.find((j) => j.id === jurisdictionId) || JURISDICTION_PROFILES[0];

  // Dynamic metrics matching the Overview KPI row
  const sessionItemsCount = historyLog.reduce((acc, entry) => acc + entry.items.length, 0);
  const kpiItemsSorted =
    (periodFilter === 'month' ? 122 : periodFilter === 'week' ? 34 : 410) + sessionItemsCount;
  const kpiWasteDiverted = (
    (periodFilter === 'month' ? 31.3 : periodFilter === 'week' ? 8.4 : 112.0) +
    sessionItemsCount * 0.2 +
    bonusDivertedKg
  ).toFixed(1);
  const kpiCo2Avoided = (
    (periodFilter === 'month' ? 17.8 : periodFilter === 'week' ? 4.9 : 64.2) +
    (sessionItemsCount * 0.2 + bonusDivertedKg) * 0.65
  ).toFixed(1);
  const diversionGoalPercent = Math.min(
    100,
    Math.round((Number(kpiWasteDiverted) / Math.max(5, monthlyGoalKg)) * 100)
  );

  const getCategoryTagColors = (category: WasteCategory) => {
    switch (category) {
      case WasteCategory.WET_BIODEGRADABLE:
        return {
          label: 'Organic / Wet',
          text: isDark ? 'text-emerald-300' : 'text-[#1E5E36]',
          bg: isDark ? 'bg-emerald-950/70' : 'bg-[#E6F3EA]',
          border: isDark ? 'border-emerald-700/50' : 'border-[#B8DEC4]',
          stroke: '#10B981',
        };
      case WasteCategory.DRY_RECYCLABLE:
      case WasteCategory.DRY_NON_RECYCLABLE:
        return {
          label: 'Recyclable / Dry',
          text: isDark ? 'text-sky-300' : 'text-[#1D4ED8]',
          bg: isDark ? 'bg-sky-950/70' : 'bg-[#DBEAFE]',
          border: isDark ? 'border-sky-700/50' : 'border-[#BFDBFE]',
          stroke: '#0EA5E9',
        };
      case WasteCategory.DOMESTIC_HAZARDOUS:
      case WasteCategory.SANITARY_BIOMEDICAL:
      case WasteCategory.E_WASTE:
        return {
          label: 'Hazardous / Safe Stream',
          text: isDark ? 'text-rose-300' : 'text-[#B91C1C]',
          bg: isDark ? 'bg-rose-950/70' : 'bg-[#FEE2E2]',
          border: isDark ? 'border-rose-700/50' : 'border-[#FECACA]',
          stroke: '#EF4444',
        };
      default:
        return {
          label: 'General / Verify',
          text: isDark ? 'text-amber-300' : 'text-[#B45309]',
          bg: isDark ? 'bg-amber-950/70' : 'bg-[#FEF3C7]',
          border: isDark ? 'border-amber-700/50' : 'border-[#FDE68A]',
          stroke: '#F59E0B',
        };
    }
  };

  const sectionTitleMap: Record<PageRoute, string> = {
    overview: 'Overview',
    identify: 'Identify waste',
    guide: 'Sorting guide',
    activity: 'Waste activity',
    impact: 'My impact',
    collection: 'Collection points',
    about: 'About & CPCB Rules',
    faq: 'Help & FAQ',
    settings: 'Settings',
  };

  // Surface styling tokens matching the calm dark-forest & warm-sage aesthetic
  const surfaceCard = isDark
    ? 'bg-[#0D1A12]/86 backdrop-blur-md border border-[#1B3224] text-slate-100 shadow-lg'
    : 'bg-white/92 backdrop-blur-md border border-[#E4ECE4] text-[#141E17] shadow-2xs';

  const sageHighlightCard = isDark
    ? 'bg-[#112319]/90 backdrop-blur-md border border-[#22432F] text-slate-100 shadow-lg'
    : 'bg-[#EEF5EE]/95 backdrop-blur-md border border-[#D8E6D9] text-[#141E17] shadow-2xs';

  const mutedText = isDark ? 'text-[#8FA596]' : 'text-[#606C62]';
  const primaryHeading = isDark ? 'text-white' : 'text-[#141E17]';

  // Reusable Camera / Dropzone Terminal
  const renderOpticalScannerBox = (compactForOverview: boolean) => (
    <div className="space-y-4">
      {inputTab === 'upload' ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`relative rounded-xl border-2 border-dashed transition-all overflow-hidden ${
            isDragging
              ? 'border-[#10B981] bg-emerald-500/10'
              : isDark
              ? 'border-[#213B2B] bg-[#09130D]/80 hover:border-[#325A42]'
              : 'border-[#D5DFD6] bg-[#F9FBF9] hover:border-[#B6C8B8]'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileLoad(file);
            }}
            className="hidden"
          />

          <div
            className={`p-5 flex flex-col items-center justify-center text-center ${
              compactForOverview ? 'min-h-[215px]' : 'min-h-[290px]'
            }`}
          >
            {previewImage && !compactForOverview ? (
              <div className="relative w-full max-h-[280px] flex flex-col items-center">
                <img
                  src={previewImage}
                  alt="Waste preview"
                  referrerPolicy="no-referrer"
                  className="max-h-[210px] w-auto object-contain rounded-lg border border-emerald-500/25 shadow-sm"
                />
                <div className="mt-3 flex flex-wrap items-center justify-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={`px-3.5 py-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                      isDark
                        ? 'bg-[#14251B] border-[#264332] text-slate-200 hover:bg-[#1C3226]'
                        : 'bg-white border-[#D0DBD1] text-[#1E2922] hover:bg-[#F3F6F3]'
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Upload image</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCameraError(null);
                      setInputTab('camera');
                    }}
                    className={`px-3.5 py-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                      isDark
                        ? 'bg-[#14251B] border-[#264332] text-slate-200 hover:bg-[#1C3226]'
                        : 'bg-white border-[#D0DBD1] text-[#1E2922] hover:bg-[#F3F6F3]'
                    }`}
                  >
                    <Camera className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Use camera</span>
                  </button>
                  <button
                    type="button"
                    disabled={isAnalyzing}
                    onClick={() => handleAnalyzeWaste(undefined, undefined, false)}
                    className="px-4 py-2 rounded-lg bg-[#2E854E] hover:bg-[#236B3E] text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Scan className="w-3.5 h-3.5" />
                    <span>{isAnalyzing ? 'Analyzing...' : 'Classify Waste Now'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 max-w-sm">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto ${
                    isDark ? 'bg-[#162C20] text-emerald-400' : 'bg-[#E6F3EA] text-[#1E5E36]'
                  }`}
                >
                  <Scan className="w-5 h-5" />
                </div>
                <div>
                  <div className={`font-display text-sm font-bold ${primaryHeading}`}>
                    Drop a photo of your waste here
                  </div>
                  <p className={`text-xs mt-0.5 ${mutedText}`}>
                    or use one of the options below (CPCB / BBMP / IMC 6-Bin)
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 rounded-lg bg-[#2E854E] hover:bg-[#236B3E] text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload image</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCameraError(null);
                      setInputTab('camera');
                    }}
                    className={`px-4 py-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      isDark
                        ? 'bg-[#122219] hover:bg-[#192F22] border-[#264332] text-slate-200'
                        : 'bg-white hover:bg-[#F3F6F3] border-[#D0DBD1] text-[#1E2922]'
                    }`}
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Use camera</span>
                  </button>

                  {compactForOverview && (
                    <button
                      type="button"
                      disabled={isAnalyzing}
                      onClick={() => handleAnalyzeWaste(undefined, undefined, true)}
                      className={`px-3.5 py-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                        isDark
                          ? 'bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/30 text-emerald-300'
                          : 'bg-[#EEF5EE] hover:bg-[#E1EDE2] border-[#C8DEC9] text-[#1E5E36]'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{isAnalyzing ? 'Scanning...' : 'Scan active photo'}</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Scanning Overlay */}
            <AnimatePresence>
              {isAnalyzing && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-[#0A140E]/92 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-white z-20"
                >
                  <motion.div
                    className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent"
                    animate={{ top: ['10%', '90%', '10%'] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: 'linear' }}
                  />
                  <div className="w-11 h-11 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center mb-3">
                    <Scan className="w-5 h-5 text-emerald-400 animate-spin" />
                  </div>
                  <div className="font-display text-sm font-semibold">
                    Analyzing Waste Image...
                  </div>
                  <p className="font-mono text-xs text-emerald-300 mt-1 text-center">
                    {SCAN_STAGES[scanStageIndex]}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      ) : (
        /* Live Webcam & Optical Simulator Box */
        <div className="rounded-xl border border-[#244030] bg-[#08110C] p-3.5 text-white space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  cameraSubMode === 'hardware' && hardwareCameraActive
                    ? 'bg-emerald-400 animate-ping'
                    : 'bg-amber-400'
                }`}
              />
              <span className="font-mono text-xs text-slate-200">
                {cameraSubMode === 'hardware'
                  ? hardwareCameraActive
                    ? `LIVE WEBCAM (${activeCameraLabel})`
                    : 'INITIALIZING CAMERA...'
                  : 'OPTICAL CAMERA SIMULATOR'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {cameraSubMode === 'hardware' && videoDevices.length > 1 && (
                <select
                  value={selectedDeviceId}
                  onChange={(e) => {
                    setSelectedDeviceId(e.target.value);
                    startHardwareCamera(e.target.value);
                  }}
                  className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-200"
                >
                  {videoDevices.map((dev, i) => (
                    <option key={dev.deviceId || i} value={dev.deviceId}>
                      {dev.label || `Camera ${i + 1}`}
                    </option>
                  ))}
                </select>
              )}

              {cameraSubMode === 'hardware' && (
                <button
                  type="button"
                  onClick={() => setMirrorWebcam((m) => !m)}
                  className="px-2 py-1 rounded bg-slate-800 text-[11px] text-slate-300 hover:text-white cursor-pointer"
                >
                  {mirrorWebcam ? 'Mirrored' : 'Normal'}
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setCameraError(null);
                  setCameraSubMode('hardware');
                  startHardwareCamera();
                }}
                className={`px-2 py-1 rounded text-[11px] cursor-pointer ${
                  cameraSubMode === 'hardware'
                    ? 'bg-[#2E854E] text-white font-semibold'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                Live Webcam
              </button>
              <button
                type="button"
                onClick={() => {
                  stopHardwareCamera();
                  setCameraSubMode('simulated');
                }}
                className={`px-2 py-1 rounded text-[11px] cursor-pointer ${
                  cameraSubMode === 'simulated'
                    ? 'bg-[#2E854E] text-white font-semibold'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                Simulated
              </button>
              <button
                type="button"
                onClick={() => {
                  stopHardwareCamera();
                  setInputTab('upload');
                }}
                className="px-2 py-1 rounded bg-slate-800 text-[11px] text-slate-300 hover:text-white cursor-pointer"
              >
                Back to Upload
              </button>
            </div>
          </div>

          {cameraError && (
            <div className="p-2.5 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-between gap-2 text-[11px] text-amber-200">
              <span>{cameraError}</span>
              <button
                type="button"
                onClick={() => startHardwareCamera()}
                className="px-2 py-1 rounded bg-amber-500/30 text-white font-semibold shrink-0 cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          <div className="relative rounded-lg overflow-hidden aspect-[16/9] bg-black flex items-center justify-center">
            <video
              ref={attachStreamToVideoElement}
              autoPlay
              playsInline
              muted
              onLoadedMetadata={(e) => {
                e.currentTarget.play().catch(() => {});
              }}
              className={`w-full h-full object-cover ${
                cameraSubMode === 'hardware' ? 'block' : 'hidden'
              } ${mirrorWebcam ? '-scale-x-100' : ''}`}
            />

            {cameraSubMode === 'hardware' && !hardwareCameraActive && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 p-4 text-center space-y-2">
                <Camera className="w-7 h-7 text-emerald-400 animate-pulse" />
                <div className="text-xs font-medium text-slate-200">
                  {isStartingCamera ? 'Connecting to Hardware Webcam...' : 'Webcam Standby'}
                </div>
                {!isStartingCamera && (
                  <button
                    type="button"
                    onClick={() => startHardwareCamera()}
                    className="px-3.5 py-1.5 rounded-lg bg-[#2E854E] text-white font-semibold text-xs cursor-pointer"
                  >
                    Activate Camera
                  </button>
                )}
              </div>
            )}

            {cameraSubMode === 'simulated' && (
              <img
                src={previewImage}
                alt="Simulated camera feed"
                referrerPolicy="no-referrer"
                className="w-full h-full object-contain"
              />
            )}

            <motion.div
              className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent pointer-events-none"
              animate={{ top: ['10%', '88%', '10%'] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            />

            <div className="absolute bottom-2.5 inset-x-3 flex items-center justify-between gap-2 bg-black/80 backdrop-blur-sm border border-white/15 rounded-lg px-3 py-2">
              <span className="font-mono text-[11px] text-emerald-400 tabular-nums">
                {cameraSubMode === 'hardware' && hardwareCameraActive
                  ? `LIVE · ${cameraResolution}`
                  : 'OPTICAL SIMULATOR'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleLockCameraFrame}
                  className="px-2.5 py-1 bg-white/15 hover:bg-white/25 text-white text-xs font-medium rounded-md cursor-pointer"
                >
                  Lock Frame
                </button>
                <button
                  type="button"
                  disabled={isAnalyzing}
                  onClick={() => handleAnalyzeWaste(undefined, undefined, compactForOverview)}
                  className="px-3 py-1 bg-[#2E854E] hover:bg-[#236B3E] text-white text-xs font-semibold rounded-md cursor-pointer"
                >
                  Capture & Analyze
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Preset Test Bar + Privacy Note */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-xs ${mutedText}`}>
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span>Real-time classification via CPCB SWM 2016, BBMP &amp; Indore IMC 6-Bin rules.</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px]">Test scenes:</span>
          {WASTE_SAMPLE_PRESETS.map((preset, idx) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => {
                handleSelectPreset(preset.id);
                setInputTab('upload');
              }}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                isCurrentImagePreset && selectedPresetId === preset.id
                  ? 'bg-[#2E854E] text-white'
                  : isDark
                  ? 'bg-[#14251B] text-slate-300 hover:bg-[#1E3628]'
                  : 'bg-[#EEF2EE] text-[#3A473D] hover:bg-[#E1E8E2]'
              }`}
            >
              Scene {idx + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const workspaceNavItems: {
    id: PageRoute;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    count?: number;
  }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutGrid },
    { id: 'identify', label: 'Identify waste', icon: Scan },
    { id: 'guide', label: 'Sorting guide', icon: BookOpen },
    { id: 'activity', label: 'Waste activity', icon: History, count: historyLog.length },
    { id: 'impact', label: 'My impact', icon: Sparkles },
    {
      id: 'collection',
      label: 'Collection points',
      icon: MapPin,
      count: pickupBookings.length > 0 ? pickupBookings.length : undefined,
    },
  ];

  const platformPagesItems: {
    id: PageRoute;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { id: 'about', label: 'About & CPCB Rules', icon: FileText },
    { id: 'faq', label: 'Help & FAQ', icon: MessageSquare },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div
      className={`min-h-screen flex relative transition-colors duration-300 ${
        isDark ? 'bg-[#07110B] text-slate-100' : 'bg-[#F6F8F5] text-[#141E17]'
      }`}
    >
      {/* Dynamic User-Interactive 3D AI Sphere Bubble Canvas Background */}
      <InteractiveEcoBackground isDark={isDark} />

      {/* =====================================================================
          COMPACT, APPROPRIATELY SIZED LEFT NAVIGATION SIDEBAR (NO CLUNKY GRAPHIC LOGO)
         ===================================================================== */}
      <aside
        className={`${
          isSidebarCollapsed ? 'w-[60px]' : 'w-[228px]'
        } relative z-20 transition-all duration-200 border-r flex flex-col justify-between shrink-0 sticky top-0 h-screen overflow-x-hidden select-none ${
          isDark
            ? 'bg-[#0A160F]/90 backdrop-blur-xl border-[#182B1F]'
            : 'bg-white/92 backdrop-blur-xl border-[#E4EBE4]'
        }`}
      >
        <div
          className={`${
            isSidebarCollapsed ? 'px-2 py-3.5' : 'px-3.5 py-4'
          } space-y-5 overflow-y-auto overflow-x-hidden no-scrollbar flex-1`}
        >
          {/* Compact Top Navigation Header (Clean Wordmark when expanded, single toggle icon when collapsed) */}
          <div
            className={`flex items-center ${
              isSidebarCollapsed ? 'justify-center' : 'justify-between px-1.5'
            }`}
          >
            {!isSidebarCollapsed && (
              <button
                type="button"
                onClick={() => setActiveSection('overview')}
                className="text-left focus:outline-none cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#10B981]" />
                  <span
                    className={`font-display text-base font-extrabold tracking-tight ${primaryHeading}`}
                  >
                    TrashVision
                  </span>
                </div>
                <div className="text-[10px] font-mono text-emerald-500/90 pl-4">
                  SWM 2016 · AI ENGINE
                </div>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsSidebarCollapsed((c) => !c)}
              title={isSidebarCollapsed ? 'Expand Navigation' : 'Collapse Navigation'}
              className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                isDark
                  ? 'bg-[#112117] border-[#213B2B] text-slate-300 hover:text-white hover:bg-[#172C1F]'
                  : 'bg-[#F4F7F4] border-[#DCE5DD] text-[#4F5D52] hover:text-[#141E17] hover:bg-[#EAEFEA]'
              }`}
            >
              <Menu className="w-4 h-4" />
            </button>
          </div>

          {/* Group 1: Collapsible "YOUR WORKSPACE" */}
          <div className="space-y-1">
            {!isSidebarCollapsed ? (
              <button
                type="button"
                onClick={() => setIsWorkspaceGroupOpen((o) => !o)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[10px] font-semibold tracking-wider uppercase transition-colors cursor-pointer ${
                  isDark
                    ? 'text-[#7B9383] hover:text-slate-200 hover:bg-[#112117]'
                    : 'text-[#7A887C] hover:text-[#141E17] hover:bg-[#F3F6F3]'
                }`}
              >
                <span>Your Workspace</span>
                {isWorkspaceGroupOpen ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
              </button>
            ) : (
              <div className="w-6 mx-auto h-px bg-emerald-500/20 my-1" />
            )}

            <AnimatePresence initial={false}>
              {(isWorkspaceGroupOpen || isSidebarCollapsed) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className={
                    isSidebarCollapsed
                      ? 'flex flex-col items-center space-y-1 overflow-hidden'
                      : 'space-y-0.5 overflow-hidden'
                  }
                >
                  {workspaceNavItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeSection === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        title={item.label}
                        onClick={() => setActiveSection(item.id)}
                        className={`flex items-center ${
                          isSidebarCollapsed
                            ? 'w-9 h-9 justify-center rounded-xl'
                            : 'w-full justify-between px-2.5 py-2 rounded-xl'
                        } text-xs font-medium transition-colors cursor-pointer ${
                          isActive
                            ? isDark
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold'
                              : 'bg-[#EAF3EC] text-[#1E5E36] font-semibold'
                            : isDark
                            ? 'text-slate-400 hover:bg-[#122318] hover:text-slate-100'
                            : 'text-[#4F5D52] hover:bg-[#F3F6F3] hover:text-[#141E17]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Icon
                            className={`w-4 h-4 shrink-0 ${
                              isActive
                                ? isDark
                                  ? 'text-emerald-400'
                                  : 'text-[#236B3E]'
                                : isDark
                                ? 'text-slate-400'
                                : 'text-[#6E7B70]'
                            }`}
                          />
                          {!isSidebarCollapsed && <span className="truncate">{item.label}</span>}
                        </div>
                        {!isSidebarCollapsed && typeof item.count === 'number' && item.count > 0 && (
                          <span
                            className={`font-mono text-[10px] px-1.5 py-0.5 rounded tabular-nums ${
                              isDark
                                ? 'bg-emerald-500/15 text-emerald-300'
                                : 'bg-[#DCE9DF] text-[#1E5E36]'
                            }`}
                          >
                            {item.count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Group 2: Collapsible "PLATFORM & PAGES" (Essential Website Pages) */}
          <div className="space-y-1 pt-1">
            {!isSidebarCollapsed ? (
              <button
                type="button"
                onClick={() => setIsPagesGroupOpen((o) => !o)}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[10px] font-semibold tracking-wider uppercase transition-colors cursor-pointer ${
                  isDark
                    ? 'text-[#7B9383] hover:text-slate-200 hover:bg-[#112117]'
                    : 'text-[#7A887C] hover:text-[#141E17] hover:bg-[#F3F6F3]'
                }`}
              >
                <span>Platform &amp; Pages</span>
                {isPagesGroupOpen ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
              </button>
            ) : (
              <div className="w-6 mx-auto h-px bg-emerald-500/20 my-1" />
            )}

            <AnimatePresence initial={false}>
              {(isPagesGroupOpen || isSidebarCollapsed) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className={
                    isSidebarCollapsed
                      ? 'flex flex-col items-center space-y-1 overflow-hidden'
                      : 'space-y-0.5 overflow-hidden'
                  }
                >
                  {platformPagesItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeSection === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        title={item.label}
                        onClick={() => setActiveSection(item.id)}
                        className={`flex items-center ${
                          isSidebarCollapsed
                            ? 'w-9 h-9 justify-center rounded-xl'
                            : 'w-full justify-between px-2.5 py-2 rounded-xl'
                        } text-xs font-medium transition-colors cursor-pointer ${
                          isActive
                            ? isDark
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold'
                              : 'bg-[#EAF3EC] text-[#1E5E36] font-semibold'
                            : isDark
                            ? 'text-slate-400 hover:bg-[#122318] hover:text-slate-100'
                            : 'text-[#4F5D52] hover:bg-[#F3F6F3] hover:text-[#141E17]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Icon
                            className={`w-4 h-4 shrink-0 ${
                              isActive
                                ? isDark
                                  ? 'text-emerald-400'
                                  : 'text-[#236B3E]'
                                : isDark
                                ? 'text-slate-400'
                                : 'text-[#6E7B70]'
                            }`}
                          />
                          {!isSidebarCollapsed && <span className="truncate">{item.label}</span>}
                        </div>
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Bottom Sidebar User Profile Pill */}
        <div
          className={`${
            isSidebarCollapsed ? 'px-2 py-3' : 'p-3'
          } border-t shrink-0 ${isDark ? 'border-[#182B1F]' : 'border-[#E8EFE8]'}`}
        >
          <button
            type="button"
            onClick={() => setActiveSection('settings')}
            title="Account & Workspace Settings"
            className={`w-full flex items-center ${
              isSidebarCollapsed ? 'justify-center' : 'justify-between px-1.5 py-1'
            } rounded-xl transition-colors cursor-pointer`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`w-8 h-8 rounded-full font-display text-xs font-bold flex items-center justify-center shrink-0 ${
                  isDark
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-[#DCE9DF] text-[#1E5E36]'
                }`}
              >
                {userName.slice(0, 2).toUpperCase()}
              </div>
              {!isSidebarCollapsed && (
                <div className="min-w-0 text-left">
                  <div className={`text-xs font-semibold truncate ${primaryHeading}`}>
                    {userName}
                  </div>
                  <div className={`text-[10px] truncate ${mutedText}`}>
                    {activeJurisdiction.shortName}
                  </div>
                </div>
              )}
            </div>
            {!isSidebarCollapsed && <Sliders className={`w-3.5 h-3.5 shrink-0 ${mutedText}`} />}
          </button>
        </div>
      </aside>

      {/* =====================================================================
          MAIN WORKSPACE AREA (PROPER INDENTATION & CONTAINER WIDTH)
         ===================================================================== */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        {/* Compact Top Header Bar matching reference screenshot */}
        <header
          className={`sticky top-0 z-20 backdrop-blur-md border-b px-6 lg:px-10 h-14 flex items-center transition-colors ${
            isDark
              ? 'bg-[#07110B]/80 border-[#182B1F]'
              : 'bg-[#F6F8F5]/85 border-[#E4EBE4]'
          }`}
        >
          <div className="max-w-[1180px] w-full mx-auto flex items-center justify-between gap-4">
            {/* Left: Breadcrumb */}
            <div className="flex items-center gap-2 text-xs sm:text-sm">
              <button
                type="button"
                onClick={() => setActiveSection('overview')}
                className={`${mutedText} hover:underline cursor-pointer`}
              >
                My workspace
              </button>
              <span className={mutedText}>&rsaquo;</span>
              <span className={`font-semibold ${primaryHeading}`}>
                {sectionTitleMap[activeSection]}
              </span>
            </div>

            {/* Right: Search Command, Location/ULB Selector, Theme Toggle, Vision Active Status */}
            <div className="flex items-center gap-2 sm:gap-2.5">
              {/* Search Command Trigger */}
              <button
                type="button"
                onClick={() => setIsCommandModalOpen(true)}
                className={`hidden md:flex items-center justify-between gap-3 border rounded-xl px-3 py-1.5 text-xs transition-colors cursor-pointer w-48 ${
                  isDark
                    ? 'bg-[#0E1C14] border-[#1F3829] text-slate-300 hover:border-emerald-500/50'
                    : 'bg-white border-[#DCE3DD] text-[#606C62] hover:border-[#236B3E]'
                }`}
              >
                <span className="flex items-center gap-1.5 truncate">
                  <Search className="w-3.5 h-3.5 shrink-0" />
                  <span>Search waste...</span>
                </span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                    isDark ? 'bg-[#16291E] text-slate-400' : 'bg-[#F2F5F2] text-[#88948A]'
                  }`}
                >
                  ⌘K
                </span>
              </button>

              {/* Location / Municipal Rule Profile Selector */}
              <div
                className={`flex items-center border rounded-xl px-2.5 py-1.5 text-xs ${
                  isDark
                    ? 'bg-[#0E1C14] border-[#1F3829] text-slate-200'
                    : 'bg-white border-[#DCE3DD] text-[#141E17]'
                }`}
              >
                <MapPin className="w-3.5 h-3.5 text-emerald-500 mr-1.5 shrink-0" />
                <select
                  aria-label="Select municipal sorting rules location"
                  value={jurisdictionId}
                  onChange={(e) => setJurisdictionId(e.target.value)}
                  className={`bg-transparent font-medium text-xs focus:outline-none pr-1 cursor-pointer ${
                    isDark ? 'text-slate-200 [&>option]:bg-[#0B1710]' : 'text-[#141E17]'
                  }`}
                >
                  {JURISDICTION_PROFILES.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.shortName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Light / Dark Theme Toggle Button */}
              <button
                type="button"
                onClick={() => setIsDark((d) => !d)}
                title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                aria-label="Toggle theme"
                className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-colors cursor-pointer ${
                  isDark
                    ? 'bg-[#0E1C14] border-[#1F3829] text-slate-200 hover:bg-[#162B1F]'
                    : 'bg-white border-[#DCE3DD] text-[#1E2922] hover:bg-[#EFF4EF]'
                }`}
              >
                {isDark ? (
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                ) : (
                  <Moon className="w-3.5 h-3.5 text-[#236B3E]" />
                )}
              </button>

              {/* VISION ACTIVE Pill matching reference screenshot */}
              <button
                type="button"
                onClick={() => setShowSafetyToast((s) => !s)}
                className={`px-3 py-1.5 rounded-full border text-[11px] font-mono font-semibold tracking-wider uppercase flex items-center gap-1.5 cursor-pointer ${
                  isDark
                    ? 'bg-[#102619] border-[#234E34] text-emerald-300'
                    : 'bg-[#E6F3EA] border-[#B8DEC4] text-[#1E5E36]'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>{forceDemoMode ? 'DEMO MODE' : 'VISION ACTIVE'}</span>
              </button>
            </div>
          </div>
        </header>

        {/* Optional Status Drawer when VISION ACTIVE pill is clicked */}
        {showSafetyToast && (
          <div className="max-w-[1180px] w-full mx-auto px-6 lg:px-10 pt-3">
            <div
              className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-3 text-xs ${
                isDark
                  ? 'bg-[#0E1C14] border-[#213D2B] text-emerald-300'
                  : 'bg-white border-[#D5E2D7] text-[#1E5E36]'
              }`}
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>
                  <strong>Active Classification Pipeline:</strong>{' '}
                  {forceDemoMode
                    ? 'Benchmark Simulation Mode'
                    : apiConnected
                    ? 'Live Gemini Multimodal Vision + CPCB SWM 2016 / BBMP / Indore IMC 6-Bin Engine'
                    : 'Real Optical Chromatic & Structural Analyzer + CPCB/BBMP/IMC Rules Engine'}
                </span>
              </div>
              <label className="inline-flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={forceDemoMode}
                  onChange={(e) => setForceDemoMode(e.target.checked)}
                  className="rounded border-emerald-600 text-emerald-600"
                />
                <span>Use Benchmark Demo Mode for Preset Scenes</span>
              </label>
            </div>
          </div>
        )}

        {/* Main Content Container with balanced indentation */}
        <main className="flex-1 max-w-[1180px] w-full mx-auto px-6 lg:px-10 py-7 space-y-7">
          {errorMessage && (
            <div className="bg-rose-500/15 border border-rose-500/40 rounded-xl p-4 flex items-center justify-between gap-4 text-xs sm:text-sm text-rose-400">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-xs font-semibold underline cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* ===================================================================
              PAGE 1: OVERVIEW
             =================================================================== */}
          {activeSection === 'overview' && (
            <motion.div
              key="view-overview"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* Greeting Header + Safety-First Link + Period Selector */}
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <h1
                    className={`font-display text-2xl sm:text-3xl font-bold tracking-tight ${primaryHeading}`}
                  >
                    Good morning, {userName}.
                  </h1>
                  <p className={`text-xs sm:text-sm mt-1 ${mutedText}`}>
                    A little sorting today. A healthier planet tomorrow.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveSection('about')}
                    className={`text-xs font-medium flex items-center gap-1.5 cursor-pointer ${mutedText} hover:underline`}
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>Safety-first guidance</span>
                  </button>

                  <div
                    className={`flex items-center gap-1 border rounded-xl p-1 ${
                      isDark ? 'bg-[#0E1C14] border-[#1F3829]' : 'bg-white border-[#DCE3DD]'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5 text-emerald-500 ml-2" />
                    {(
                      [
                        { id: 'month', label: 'This month' },
                        { id: 'week', label: 'This week' },
                        { id: 'all', label: 'All time' },
                      ] as const
                    ).map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPeriodFilter(p.id)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                          periodFilter === p.id
                            ? isDark
                              ? 'bg-emerald-500/20 text-emerald-300 font-semibold'
                              : 'bg-[#EAF3EC] text-[#1E5E36] font-semibold'
                            : `${mutedText} hover:opacity-90`
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* KPI Metric Cards (2x2 on tablet, 4-col on desktop) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div
                  onClick={() => setActiveSection('activity')}
                  className={`${surfaceCard} hover:border-emerald-500/40 rounded-2xl p-5 flex flex-col justify-between cursor-pointer transition-all`}
                >
                  <div className={`flex items-center justify-between text-xs ${mutedText}`}>
                    <span>Items sorted</span>
                    <Scan className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="my-2.5 flex items-baseline gap-1.5">
                    <span className={`font-display text-3xl font-bold tabular-nums ${primaryHeading}`}>
                      {kpiItemsSorted}
                    </span>
                    <span className={`text-xs ${mutedText}`}>items</span>
                  </div>
                  <div
                    className={`text-[11px] font-medium flex items-center gap-1 ${
                      isDark ? 'text-emerald-400' : 'text-[#1E5E36]'
                    }`}
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>
                      +{20 + sessionItemsCount} this {periodFilter}
                    </span>
                  </div>
                </div>

                <div
                  onClick={() => setActiveSection('impact')}
                  className={`${surfaceCard} hover:border-emerald-500/40 rounded-2xl p-5 flex flex-col justify-between cursor-pointer transition-all`}
                >
                  <div className={`flex items-center justify-between text-xs ${mutedText}`}>
                    <span>Waste diverted</span>
                    <Recycle className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="my-2.5 flex items-baseline gap-1.5">
                    <span className={`font-display text-3xl font-bold tabular-nums ${primaryHeading}`}>
                      {kpiWasteDiverted}
                    </span>
                    <span className={`text-xs ${mutedText}`}>kg</span>
                  </div>
                  <div
                    className={`text-[11px] font-medium flex items-center gap-1 ${
                      isDark ? 'text-emerald-400' : 'text-[#1E5E36]'
                    }`}
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>+8.2 kg this {periodFilter}</span>
                  </div>
                </div>

                <div
                  onClick={() => setActiveSection('impact')}
                  className={`${surfaceCard} hover:border-emerald-500/40 rounded-2xl p-5 flex flex-col justify-between cursor-pointer transition-all`}
                >
                  <div className={`flex items-center justify-between text-xs ${mutedText}`}>
                    <span>CO₂ emissions avoided</span>
                    <Leaf className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="my-2.5 flex items-baseline gap-1.5">
                    <span className={`font-display text-3xl font-bold tabular-nums ${primaryHeading}`}>
                      {kpiCo2Avoided}
                    </span>
                    <span className={`text-xs ${mutedText}`}>kg</span>
                  </div>
                  <div
                    className={`text-[11px] font-medium flex items-center gap-1 ${
                      isDark ? 'text-emerald-400' : 'text-[#1E5E36]'
                    }`}
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>+4.1 kg this {periodFilter}</span>
                  </div>
                </div>

                <div
                  onClick={() => setActiveSection('impact')}
                  className={`${surfaceCard} hover:border-emerald-500/40 rounded-2xl p-5 flex flex-col justify-between cursor-pointer transition-all`}
                >
                  <div className={`flex items-center justify-between text-xs ${mutedText}`}>
                    <span>Sorting streak</span>
                    <Sparkles className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="my-2.5 flex items-baseline gap-1.5">
                    <span className={`font-display text-3xl font-bold tabular-nums ${primaryHeading}`}>
                      7
                    </span>
                    <span className={`text-xs ${mutedText}`}>days</span>
                  </div>
                  <div
                    className={`text-[11px] font-medium flex items-center gap-1 ${
                      isDark ? 'text-emerald-400' : 'text-[#1E5E36]'
                    }`}
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>Your best streak yet!</span>
                  </div>
                </div>
              </div>

              {/* Row 2: "Not sure where it goes?" Scanner with 3D AI-Powered Sphere + "Your Last Scan" */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                {/* Left 7 Cols */}
                <div className={`lg:col-span-7 ${surfaceCard} rounded-2xl p-6 flex flex-col justify-between`}>
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <h2 className={`font-display text-lg font-bold ${primaryHeading}`}>
                        Not sure where it goes?
                      </h2>
                      <p className={`text-xs mt-0.5 ${mutedText}`}>
                        Snap it. Identify it. Sort it right.
                      </p>
                    </div>

                    {/* 3D Spherical "AI-powered" Orb Badge matching image_a63d7870.png */}
                    <div
                      className={`w-14 h-14 rounded-full flex items-center justify-center text-center text-[10px] font-semibold leading-tight shrink-0 shadow-md ${
                        isDark
                          ? 'bg-[radial-gradient(circle_at_30%_28%,rgba(62,152,96,0.55),rgba(16,46,28,0.92)_70%)] border border-emerald-400/25 text-emerald-200'
                          : 'bg-[radial-gradient(circle_at_30%_28%,#FFFFFF,#D5E9DA_75%)] border border-[#B8DEC4] text-[#1E5E36]'
                      }`}
                    >
                      AI-powered
                    </div>
                  </div>

                  {renderOpticalScannerBox(true)}
                </div>

                {/* Right 5 Cols: "YOUR LAST SCAN" Card */}
                <div className={`lg:col-span-5 ${sageHighlightCard} rounded-2xl p-6 flex flex-col justify-between`}>
                  {activeItem && analysisResult ? (
                    <>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between text-xs">
                          <span className={`font-mono text-[11px] font-semibold tracking-wider uppercase ${mutedText}`}>
                            Your Last Scan ({activeJurisdiction.shortName})
                          </span>
                          <span
                            className={`font-semibold flex items-center gap-1 tabular-nums ${
                              isDark ? 'text-emerald-400' : 'text-[#1E5E36]'
                            }`}
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{activeItem.confidenceScore.toFixed(0)}% confidence</span>
                          </span>
                        </div>

                        <div className="flex items-start gap-4">
                          <img
                            src={displayedEvidenceImage}
                            alt={activeItem.itemName}
                            referrerPolicy="no-referrer"
                            className="w-24 h-24 rounded-xl object-cover border border-emerald-500/30 bg-slate-950 shrink-0"
                          />
                          <div className="space-y-1 min-w-0">
                            <span
                              className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded ${
                                getCategoryTagColors(activeItem.wasteCategory).bg
                              } ${getCategoryTagColors(activeItem.wasteCategory).text}`}
                            >
                              {getCategoryTagColors(activeItem.wasteCategory).label}
                            </span>
                            <h3 className={`font-display text-lg font-bold leading-snug ${primaryHeading}`}>
                              {activeItem.itemName}
                            </h3>
                            <p className={`text-xs truncate ${mutedText}`}>
                              {activeItem.materialLabel}
                            </p>
                            <div
                              className={`pt-1 text-xs font-semibold flex items-center gap-1.5 ${
                                isDark ? 'text-sky-400' : 'text-[#1D4ED8]'
                              }`}
                            >
                              <Trash2 className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">{activeItem.binColorBadge}</span>
                            </div>
                          </div>
                        </div>

                        <div
                          className={`pt-3 border-t space-y-1.5 ${
                            isDark ? 'border-[#234732]' : 'border-[#D8E6D9]'
                          }`}
                        >
                          <div className={`text-xs font-bold ${primaryHeading}`}>
                            Before you bin it
                          </div>
                          <p className={`text-xs leading-relaxed ${mutedText}`}>
                            {activeItem.preparationSteps.slice(0, 2).join(' ')}
                          </p>
                          {activeItem.safetyWarnings[0] && (
                            <p className="text-[11px] font-medium text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1.5 rounded-lg">
                              {activeItem.safetyWarnings[0]}
                            </p>
                          )}
                        </div>
                      </div>

                      <div
                        className={`pt-4 mt-4 border-t flex items-center justify-between text-xs ${
                          isDark ? 'border-[#234732]' : 'border-[#D8E6D9]'
                        }`}
                      >
                        <span className={`flex items-center gap-1 ${mutedText}`}>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Saved to activity ({analysisResult.items.length} items)</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setActiveSection('identify')}
                          className={`font-semibold flex items-center gap-1 cursor-pointer ${
                            isDark
                              ? 'text-emerald-300 hover:text-emerald-200'
                              : 'text-[#141E17] hover:text-[#236B3E]'
                          }`}
                        >
                          <span>Full inspection</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
                      <Scan className="w-8 h-8 text-emerald-500" />
                      <div className={`text-sm font-semibold ${primaryHeading}`}>No recent scan</div>
                      <p className={`text-xs ${mutedText}`}>
                        Upload an image or use your camera on the left to inspect waste items.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Row 3: "A place for every kind of waste" (4 Category Guide Cards) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className={`font-display text-base sm:text-lg font-bold ${primaryHeading}`}>
                    A place for every kind of waste
                  </h2>
                  <button
                    type="button"
                    onClick={() => setActiveSection('guide')}
                    className={`text-xs font-semibold flex items-center gap-1 cursor-pointer ${mutedText} hover:underline`}
                  >
                    <span>Explore the guide</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    {
                      id: 'WET',
                      title: 'Organic / Wet',
                      titleColor: isDark ? 'text-emerald-400' : 'text-[#1E5E36]',
                      iconBg: isDark
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-[#E6F3EA] text-[#1E5E36]',
                      icon: Leaf,
                      items: 'Food scraps, peels & garden waste',
                      tip: 'Green Bin · Biomethanation & Compost',
                    },
                    {
                      id: 'DRY',
                      title: 'Recyclable / Dry',
                      titleColor: isDark ? 'text-sky-400' : 'text-[#1D4ED8]',
                      iconBg: isDark
                        ? 'bg-sky-500/20 text-sky-300'
                        : 'bg-[#DBEAFE] text-[#1D4ED8]',
                      icon: Recycle,
                      items: 'Paper, PET/HDPE plastic, metal & glass',
                      tip: 'Blue Bin / DWCC · Empty, clean & dry',
                    },
                    {
                      id: 'MLP',
                      title: 'MLP & Non-Recyclable',
                      titleColor: isDark ? 'text-amber-400' : 'text-[#B45309]',
                      iconBg: isDark
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-[#FEF3C7] text-[#B45309]',
                      icon: Trash2,
                      items: 'Snack wrappers, laminates & inert ceramics',
                      tip: 'Compartment 3 / Dry MLP Co-Processing',
                    },
                    {
                      id: 'HAZARDOUS',
                      title: 'Hazardous & Sanitary',
                      titleColor: isDark ? 'text-rose-400' : 'text-[#DC2626]',
                      iconBg: isDark
                        ? 'bg-rose-500/20 text-rose-300'
                        : 'bg-[#FEE2E2] text-[#DC2626]',
                      icon: AlertTriangle,
                      items: 'Batteries, e-waste, medicines & masks',
                      tip: 'Black / Red / Yellow Dedicated Streams',
                    },
                  ].map((card) => {
                    const Icon = card.icon;
                    return (
                      <button
                        key={card.id}
                        type="button"
                        onClick={() => {
                          setGuideCategoryFilter(card.id);
                          setActiveSection('guide');
                        }}
                        className={`${surfaceCard} hover:border-emerald-500/50 rounded-2xl p-5 text-left transition-all group cursor-pointer`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center ${card.iconBg}`}
                            >
                              <Icon className="w-4 h-4" />
                            </div>
                            <span className={`font-display text-sm font-bold ${card.titleColor}`}>
                              {card.title}
                            </span>
                          </div>
                          <ArrowUpRight
                            className={`w-4 h-4 ${mutedText} group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform`}
                          />
                        </div>
                        <div className={`text-xs font-semibold ${primaryHeading}`}>
                          {card.items}
                        </div>
                        <div className={`text-[11px] mt-1 ${mutedText}`}>{card.tip}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Row 4: Bottom Split ("Recent activity" Table 8 Cols + "Small actions. Real impact." Card 4 Cols) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                {/* Left 8 Cols */}
                <div className={`lg:col-span-8 ${surfaceCard} rounded-2xl p-6 flex flex-col justify-between`}>
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className={`font-display text-base font-bold ${primaryHeading}`}>
                        Recent activity
                      </h2>
                      <button
                        type="button"
                        onClick={() => setActiveSection('activity')}
                        className={`text-xs font-semibold flex items-center gap-1 cursor-pointer ${mutedText} hover:underline`}
                      >
                        <span>View all activity</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr
                            className={`border-b text-[10px] font-semibold tracking-wider uppercase ${
                              isDark
                                ? 'border-[#1E3327] text-slate-400'
                                : 'border-[#EDF1ED] text-[#88948A]'
                            }`}
                          >
                            <th className="py-2.5 pr-3">Item &amp; Frame</th>
                            <th className="py-2.5 px-3">Category</th>
                            <th className="py-2.5 px-3">Scanned (Local Time)</th>
                            <th className="py-2.5 pl-3 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody
                          className={`divide-y text-xs ${
                            isDark ? 'divide-[#192B21]' : 'divide-[#F1F4F1]'
                          }`}
                        >
                          {historyLog.slice(0, 4).map((entry) => {
                            const primary = entry.items[0];
                            if (!primary) return null;
                            const tagStyle = getCategoryTagColors(primary.wasteCategory);
                            return (
                              <tr
                                key={entry.analysisId}
                                onClick={() => handleRestoreFromAuditLog(entry)}
                                className={`transition-colors cursor-pointer ${
                                  isDark ? 'hover:bg-[#15261D]' : 'hover:bg-[#F8FAF8]'
                                }`}
                              >
                                <td className="py-3 pr-3">
                                  <div className="flex items-center gap-3">
                                    {entry.imageDataUrl ? (
                                      <img
                                        src={entry.imageDataUrl}
                                        alt={primary.itemName}
                                        referrerPolicy="no-referrer"
                                        className="w-10 h-10 rounded-lg object-cover border border-emerald-500/30 shrink-0"
                                      />
                                    ) : (
                                      <div className="w-10 h-10 rounded-lg bg-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
                                        <Recycle className="w-4 h-4" />
                                      </div>
                                    )}
                                    <div className="min-w-0">
                                      <div className={`font-semibold truncate ${primaryHeading}`}>
                                        {primary.itemName}
                                        {entry.items.length > 1
                                          ? ` (+${entry.items.length - 1} more)`
                                          : ''}
                                      </div>
                                      <div className={`text-[11px] truncate ${mutedText}`}>
                                        {primary.materialLabel}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3 px-3">
                                  <span
                                    className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded ${tagStyle.bg} ${tagStyle.text}`}
                                  >
                                    {tagStyle.label}
                                  </span>
                                </td>
                                <td className={`py-3 px-3 font-mono text-[11px] tabular-nums ${mutedText}`}>
                                  {entry.timestamp}
                                </td>
                                <td className="py-3 pl-3 text-right">
                                  <span
                                    className={`inline-flex items-center gap-1 font-medium ${
                                      isDark ? 'text-emerald-400' : 'text-[#1E5E36]'
                                    }`}
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Sorted</span>
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Right 4 Cols: "Small actions. Real impact." Sage Goal Card */}
                <div className={`lg:col-span-4 ${sageHighlightCard} rounded-2xl p-6 flex flex-col justify-between`}>
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className={`font-display text-base font-bold ${primaryHeading}`}>
                          Small actions. Real impact.
                        </h3>
                        <p className={`text-xs mt-1 leading-relaxed ${mutedText}`}>
                          You&apos;re keeping valuable resources out of landfills. Let&apos;s keep
                          the good going.
                        </p>
                      </div>
                      <Leaf className="w-5 h-5 text-emerald-500 shrink-0" />
                    </div>

                    <div className="space-y-2 pt-1">
                      <div className="flex items-baseline justify-between">
                        <div>
                          <span className={`font-display text-2xl font-bold tabular-nums ${primaryHeading}`}>
                            {kpiWasteDiverted}
                          </span>
                          <span className={`text-xs ${mutedText}`}> / {monthlyGoalKg} kg</span>
                        </div>
                        <span
                          className={`font-mono text-xs font-bold tabular-nums ${
                            isDark ? 'text-emerald-400' : 'text-[#1E5E36]'
                          }`}
                        >
                          {diversionGoalPercent}%
                        </span>
                      </div>

                      <div
                        className={`w-full h-2 rounded-full overflow-hidden ${
                          isDark ? 'bg-[#0B1610]' : 'bg-[#D5E4D7]'
                        }`}
                      >
                        <div
                          className="h-full bg-[#10B981] rounded-full transition-all duration-500"
                          style={{ width: `${diversionGoalPercent}%` }}
                        />
                      </div>

                      <p className={`text-[11px] tabular-nums ${mutedText}`}>
                        {Math.max(0, monthlyGoalKg - Number(kpiWasteDiverted)).toFixed(1)} kg to your
                        monthly diversion goal
                      </p>
                    </div>

                    <div
                      className={`p-3.5 rounded-xl border flex items-center gap-3 ${
                        isDark
                          ? 'bg-[#0C1B13] border-[#234732]'
                          : 'bg-white/90 border-[#DCE8DD]'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
                        <Award className="w-4 h-4" />
                      </div>
                      <div>
                        <div className={`text-xs font-bold ${primaryHeading}`}>
                          One week of better habits
                        </div>
                        <div className={`text-[11px] ${mutedText}`}>
                          7 days of sorting. A streak worth keeping.
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveSection('impact')}
                    className={`mt-4 pt-3 border-t text-xs font-semibold hover:underline flex items-center gap-1 cursor-pointer ${
                      isDark
                        ? 'border-[#234732] text-emerald-400'
                        : 'border-[#D8E6D9] text-[#1E5E36]'
                    }`}
                  >
                    <span>See your full impact</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ===================================================================
              PAGE 2: IDENTIFY WASTE (Real Image Classifier + Custom Item Inspector + 4-Card Bento)
             =================================================================== */}
          {activeSection === 'identify' && (
            <motion.div
              key="view-identify"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* Top Input & Benchmark / Direct Item Inspector */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                <div className={`lg:col-span-7 ${surfaceCard} rounded-2xl p-6`}>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className={`font-display text-lg font-bold ${primaryHeading}`}>
                        AI Optical Waste Scanner &amp; Live Webcam
                      </h2>
                      <p className={`text-xs ${mutedText}`}>
                        Upload any waste photo or capture from your webcam for real-time CPCB, BBMP &amp; Indore IMC 6-Bin classification
                      </p>
                    </div>
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center text-center text-[9px] font-semibold leading-tight shrink-0 ${
                        isDark
                          ? 'bg-[radial-gradient(circle_at_30%_28%,rgba(62,152,96,0.55),rgba(16,46,28,0.92)_70%)] border border-emerald-400/25 text-emerald-200'
                          : 'bg-[radial-gradient(circle_at_30%_28%,#FFFFFF,#D5E9DA_75%)] border border-[#B8DEC4] text-[#1E5E36]'
                      }`}
                    >
                      AI Vision
                    </div>
                  </div>
                  {renderOpticalScannerBox(false)}
                </div>

                <div className={`lg:col-span-5 ${surfaceCard} rounded-2xl p-6 flex flex-col justify-between space-y-4`}>
                  <div className="space-y-4">
                    {/* Quick Custom Item Classifier (Type any household item) */}
                    <div className="space-y-2">
                      <h3 className={`font-display text-sm font-bold ${primaryHeading}`}>
                        Instant Item &amp; Material Rule Classifier
                      </h3>
                      <p className={`text-xs ${mutedText}`}>
                        Have a specific item in hand? Enter its name (e.g., &ldquo;broken glass jar&rdquo;, &ldquo;expired paracetamol strip&rdquo;, &ldquo;kurkure packet&rdquo;, &ldquo;used mask&rdquo;) to classify it directly:
                      </p>
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (!customItemInput.trim()) return;
                          handleInspectEncyclopediaOrCustomItem(
                            customItemInput.trim(),
                            'User-entered household waste item'
                          );
                          setCustomItemInput('');
                        }}
                        className="flex gap-2"
                      >
                        <input
                          type="text"
                          value={customItemInput}
                          onChange={(e) => setCustomItemInput(e.target.value)}
                          placeholder="e.g., Swollen lithium battery, greasy pizza box..."
                          className={`flex-1 border rounded-xl px-3 py-2 text-xs focus:outline-none ${
                            isDark
                              ? 'bg-[#09130D] border-[#213B2B] text-slate-100 focus:border-emerald-500'
                              : 'bg-[#F8FAF8] border-[#D5DFD6] text-[#141E17] focus:border-[#236B3E]'
                          }`}
                        />
                        <button
                          type="submit"
                          className="px-3.5 py-2 rounded-xl bg-[#2E854E] hover:bg-[#236B3E] text-white text-xs font-semibold shrink-0 cursor-pointer"
                        >
                          Classify
                        </button>
                      </form>
                    </div>

                    {/* Multi-Object Benchmark Scenes */}
                    <div className="space-y-2 pt-2 border-t border-emerald-500/15">
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold ${primaryHeading}`}>
                          Multi-Object Calibration Scenes
                        </span>
                        <span className={`text-[10px] font-mono ${mutedText}`}>
                          Click to load scene
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        {WASTE_SAMPLE_PRESETS.map((preset) => (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => {
                              handleSelectPreset(preset.id);
                              setInputTab('upload');
                            }}
                            className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer ${
                              isCurrentImagePreset && selectedPresetId === preset.id
                                ? isDark
                                  ? 'bg-emerald-500/15 border-emerald-500/60'
                                  : 'bg-[#EEF5EE] border-[#236B3E]'
                                : isDark
                                ? 'bg-[#09130D] border-[#1B3124] hover:border-emerald-500/40'
                                : 'bg-[#F9FBF9] border-[#E4EBE4] hover:border-[#C5D4C7]'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className={`text-xs font-bold ${primaryHeading}`}>
                                {preset.title}
                              </span>
                              <span className="font-mono text-[10px] text-emerald-500 font-semibold">
                                {preset.badgeText}
                              </span>
                            </div>
                            <p className={`text-[11px] mt-0.5 truncate ${mutedText}`}>
                              {preset.subtitle}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isAnalyzing}
                    onClick={() => handleAnalyzeWaste(undefined, undefined, false)}
                    className="w-full py-2.5 rounded-xl bg-[#2E854E] hover:bg-[#236B3E] text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                  >
                    <Scan className="w-4 h-4" />
                    <span>{isAnalyzing ? 'Scanning Waste Scene...' : 'Analyze Current Scene'}</span>
                  </button>
                </div>
              </div>

              {/* Live Jurisdiction Switcher Bar (CPCB vs BBMP vs Indore IMC 6-Bin) */}
              <div className={`${surfaceCard} rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3`}>
                <div className="flex items-center gap-2 text-xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className={mutedText}>Active Municipal Rulebook:</span>
                  <strong className={primaryHeading}>{activeJurisdiction.name}</strong>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {JURISDICTION_PROFILES.map((j) => (
                    <button
                      key={j.id}
                      type="button"
                      onClick={() => setJurisdictionId(j.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        jurisdictionId === j.id
                          ? 'bg-[#2E854E] text-white'
                          : isDark
                          ? 'bg-[#13241A] text-slate-300 hover:bg-[#1A3124]'
                          : 'bg-[#F0F4F0] text-[#4F5D52] hover:bg-[#E2EAE3]'
                      }`}
                    >
                      {j.shortName}
                    </button>
                  ))}
                </div>
              </div>

              {/* 4-Card Bento Classification Matrix Results */}
              {analysisResult && (
                <div className="space-y-5">
                  {/* Scene Header & Multi-Item Tabs */}
                  <div className={`${surfaceCard} rounded-2xl p-5 space-y-4`}>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-semibold text-emerald-400">
                            {analysisResult.mode === 'LIVE_AI'
                              ? 'REAL-TIME AI PERCEPTION + MUNICIPAL RULES ENGINE'
                              : 'BENCHMARK CALIBRATION + MUNICIPAL RULES ENGINE'}
                          </span>
                          <span>·</span>
                          <span className={`font-mono tabular-nums ${mutedText}`}>
                            {analysisResult.analysisId}
                          </span>
                          <span>·</span>
                          <span className={`font-mono tabular-nums ${mutedText}`}>
                            {analysisResult.timestamp}
                          </span>
                        </div>
                        <p className={`text-sm font-medium mt-1 ${primaryHeading}`}>
                          {analysisResult.sceneSummary}
                        </p>
                      </div>

                      {/* Item Selector Buttons */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        {analysisResult.items.map((item, idx) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setSelectedItemIndex(idx)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                              selectedItemIndex === idx
                                ? 'bg-[#2E854E] text-white'
                                : isDark
                                ? 'bg-[#14261C] text-slate-300 hover:bg-[#1C3527]'
                                : 'bg-[#F1F5F1] text-[#3A473D] hover:bg-[#E3EBE4]'
                            }`}
                          >
                            Item {idx + 1}: {item.itemName.split(' ').slice(0, 3).join(' ')}
                          </button>
                        ))}
                      </div>
                    </div>

                    {analysisResult.separationAlert && (
                      <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-start gap-2.5 text-xs text-amber-400">
                        <Layers className="w-4 h-4 shrink-0 mt-0.5" />
                        <div>
                          <strong>Multi-Stream Separation Required: </strong>
                          {analysisResult.separationAlert}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 4-Card Bento Grid */}
                  {activeItem && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                      {/* Card A: Visual Evidence with Bounding Boxes */}
                      <div className={`lg:col-span-5 ${surfaceCard} rounded-2xl p-5 flex flex-col justify-between`}>
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <span className={`text-[10px] font-mono font-semibold uppercase ${mutedText}`}>
                              Card A · Visual Evidence
                            </span>
                            <h3 className={`font-display text-sm font-bold ${primaryHeading}`}>
                              Object Localization ({analysisResult.items.length} Item
                              {analysisResult.items.length > 1 ? 's' : ''})
                            </h3>
                          </div>
                          <span className={`text-[11px] ${mutedText}`}>Click box to switch</span>
                        </div>

                        <div className="relative rounded-xl overflow-hidden bg-[#07100B] border border-emerald-500/20 aspect-[16/10] flex items-center justify-center">
                          <img
                            src={displayedEvidenceImage}
                            alt="Analyzed waste evidence"
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-contain"
                          />
                          {analysisResult.items.map((item, idx) => {
                            const isSelected = idx === selectedItemIndex;
                            const tag = getCategoryTagColors(item.wasteCategory);
                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => setSelectedItemIndex(idx)}
                                style={{
                                  left: `${item.boundingBox.x}%`,
                                  top: `${item.boundingBox.y}%`,
                                  width: `${item.boundingBox.width}%`,
                                  height: `${item.boundingBox.height}%`,
                                  borderColor: tag.stroke,
                                }}
                                className={`absolute rounded-lg border-2 transition-all cursor-pointer flex items-start justify-start p-1 ${
                                  isSelected
                                    ? 'bg-emerald-500/20 ring-2 ring-white z-10'
                                    : 'bg-black/20 opacity-80 hover:opacity-100'
                                }`}
                              >
                                <span className="px-1.5 py-0.5 rounded bg-black/85 text-[10px] font-mono text-white truncate max-w-full">
                                  #{idx + 1} {item.itemName.split(' ')[0]} (
                                  {item.confidenceScore.toFixed(0)}%)
                                </span>
                              </button>
                            );
                          })}
                        </div>

                        <div
                          className={`mt-3 pt-3 border-t flex items-center justify-between text-xs ${
                            isDark ? 'border-[#1E3327]' : 'border-[#EDF1ED]'
                          } ${mutedText}`}
                        >
                          <span className="truncate">
                            Source: <strong>{analysisResult.imageSourceLabel}</strong>
                          </span>
                          <span className="font-mono tabular-nums">
                            Conf: {analysisResult.overallSceneConfidence.toFixed(1)}%
                          </span>
                        </div>
                      </div>

                      {/* Card B & Card C */}
                      <div className="lg:col-span-7 flex flex-col gap-5 justify-between">
                        {/* Card B: Primary Classification */}
                        <div className={`${surfaceCard} rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5`}>
                          <div className="space-y-2">
                            <span className={`text-[10px] font-mono font-semibold uppercase ${mutedText}`}>
                              Card B · Primary Classification
                            </span>
                            <h3 className={`font-display text-xl font-bold ${primaryHeading}`}>
                              {activeItem.wasteCategory}: {activeItem.itemName}
                            </h3>
                            <p className={`text-xs ${mutedText}`}>
                              <strong className={primaryHeading}>Detected Material:</strong>{' '}
                              {activeItem.materialLabel}
                            </p>
                            <p className={`text-xs ${mutedText}`}>
                              <strong className={primaryHeading}>Optical Evidence:</strong>{' '}
                              {activeItem.visibleMaterialEvidence}
                            </p>
                          </div>
                          <CircularConfidenceGauge
                            value={activeItem.confidenceScore}
                            accentTheme={activeItem.accentTheme}
                            isDark={isDark}
                          />
                        </div>

                        {/* Card C: Taxonomy Breakdown */}
                        <div className={`${surfaceCard} rounded-2xl p-6`}>
                          <div className="flex items-center justify-between mb-3">
                            <span className={`text-[10px] font-mono font-semibold uppercase ${mutedText}`}>
                              Card C · Taxonomy &amp; Contamination Breakdown
                            </span>
                            <span className={`text-[11px] font-mono ${mutedText}`}>
                              {activeItem.regulatoryBasis}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div
                              className={`p-3 rounded-xl border ${
                                isDark
                                  ? 'bg-[#09130D] border-[#1D3326]'
                                  : 'bg-[#F7F9F7] border-[#E6ECE6]'
                              }`}
                            >
                              <div className={`text-[11px] ${mutedText}`}>Material Purity</div>
                              <div className={`font-mono text-base font-bold mt-0.5 tabular-nums ${primaryHeading}`}>
                                {activeItem.polymerOrMaterialPurity}%
                              </div>
                            </div>
                            <div
                              className={`p-3 rounded-xl border ${
                                isDark
                                  ? 'bg-[#09130D] border-[#1D3326]'
                                  : 'bg-[#F7F9F7] border-[#E6ECE6]'
                              }`}
                            >
                              <div className={`text-[11px] ${mutedText}`}>Contamination Risk</div>
                              <div className="font-mono text-base font-bold text-emerald-400 mt-0.5">
                                {activeItem.contaminationRiskLabel}
                              </div>
                            </div>
                            <div
                              className={`p-3 rounded-xl border ${
                                isDark
                                  ? 'bg-[#09130D] border-[#1D3326]'
                                  : 'bg-[#F7F9F7] border-[#E6ECE6]'
                              }`}
                            >
                              <div className={`text-[11px] ${mutedText}`}>Physical Condition</div>
                              <div className={`font-mono text-xs font-bold mt-1 ${primaryHeading}`}>
                                {activeItem.physicalCondition.replace(/_/g, ' ')}
                              </div>
                            </div>
                            <div
                              className={`p-3 rounded-xl border ${
                                isDark
                                  ? 'bg-[#09130D] border-[#1D3326]'
                                  : 'bg-[#F7F9F7] border-[#E6ECE6]'
                              }`}
                            >
                              <div className={`text-[11px] ${mutedText}`}>Recyclability</div>
                              <div className="text-xs font-bold text-sky-400 mt-1">
                                {activeItem.recyclabilityLabel}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Card D: Actionable Disposal Guidance & Ambiguity Resolution */}
                      <div className={`lg:col-span-12 ${sageHighlightCard} rounded-2xl p-6 space-y-4`}>
                        <div
                          className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b ${
                            isDark ? 'border-[#234732]' : 'border-[#D4E4D6]'
                          }`}
                        >
                          <div>
                            <span className={`text-[10px] font-mono font-semibold uppercase ${mutedText}`}>
                              Card D · Actionable Disposal Guidance ({activeJurisdiction.name})
                            </span>
                            <h3 className={`font-display text-lg font-bold mt-0.5 ${primaryHeading}`}>
                              Route to: {activeItem.disposalDestination}
                            </h3>
                            <p className={`text-xs ${mutedText}`}>{activeItem.collectionNotes}</p>
                          </div>
                          <span
                            className={`px-3.5 py-2 rounded-xl border font-display text-xs font-bold self-start sm:self-auto ${
                              isDark
                                ? 'bg-[#0A150F] border-emerald-500/40 text-emerald-300'
                                : 'bg-white border-[#C6DBC8] text-[#1E5E36]'
                            }`}
                          >
                            {activeItem.binColorBadge}
                          </span>
                        </div>

                        {/* Interactive Clarification Selector if Item is Ambiguous */}
                        {activeItem.isAmbiguous && activeItem.clarificationOptions && (
                          <div className="p-4 rounded-xl bg-amber-500/15 border border-amber-500/40 space-y-3">
                            <div className="flex items-start gap-2.5">
                              <HelpCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                              <div>
                                <div className={`text-xs font-bold ${primaryHeading}`}>
                                  Clarification Needed — Verify Physical Marking
                                </div>
                                <p className={`text-xs mt-0.5 ${mutedText}`}>
                                  {activeItem.ambiguityReason}
                                </p>
                                <p className="text-xs font-semibold text-amber-400 mt-1">
                                  {activeItem.clarificationQuestion}
                                </p>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                              {activeItem.clarificationOptions.map((opt) => (
                                <button
                                  key={opt.id}
                                  type="button"
                                  onClick={() =>
                                    handleResolveClarification(
                                      activeItem.id,
                                      opt.overrideMaterial,
                                      opt.overrideContamination
                                    )
                                  }
                                  className={`p-3 rounded-xl border text-left cursor-pointer ${
                                    isDark
                                      ? 'bg-[#0A150F] border-amber-500/40 hover:border-emerald-400'
                                      : 'bg-white border-[#FCD34D] hover:bg-[#F8FAF8]'
                                  }`}
                                >
                                  <div className={`text-xs font-bold ${primaryHeading}`}>
                                    {opt.label}
                                  </div>
                                  <div className="text-[11px] text-emerald-400 mt-0.5">
                                    {opt.description}
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Safety Warnings */}
                        {activeItem.safetyWarnings.map((w, idx) => (
                          <div
                            key={idx}
                            className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-300"
                          >
                            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                            <span>{w}</span>
                          </div>
                        ))}

                        {/* Interactive Pre-Disposal Checklist */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                          {activeItem.preparationSteps.map((step, sIdx) => {
                            const key = `${activeItem.id}-${sIdx}`;
                            const done = Boolean(completedSteps[key]);
                            return (
                              <button
                                key={key}
                                type="button"
                                onClick={() => toggleStepCompletion(key)}
                                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 text-xs transition-colors cursor-pointer ${
                                  done
                                    ? 'bg-emerald-500/20 border-emerald-500/40 line-through opacity-75'
                                    : isDark
                                    ? 'bg-[#0A150F] border-[#234732] text-slate-100'
                                    : 'bg-white border-[#D4E4D6] text-[#141E17]'
                                }`}
                              >
                                <CheckCircle2
                                  className={`w-4 h-4 shrink-0 mt-0.5 ${
                                    done ? 'text-emerald-400' : mutedText
                                  }`}
                                />
                                <span>
                                  <strong>Step {sIdx + 1}:</strong> {step}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* ===================================================================
              PAGE 3: SORTING GUIDE (CPCB / BBMP / Indore IMC 6-Bin + Interactive Encyclopedia)
             =================================================================== */}
          {activeSection === 'guide' && (
            <motion.div
              key="view-guide"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className={`${surfaceCard} rounded-2xl p-6 space-y-4`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className={`font-display text-xl font-bold ${primaryHeading}`}>
                      CPCB SWM 2016, BBMP &amp; Indore IMC 6-Bin Sorting Matrix
                    </h2>
                    <p className={`text-xs mt-0.5 ${mutedText}`}>
                      Switch municipal frameworks below to inspect exact bin color codes and compartment rules for{' '}
                      <strong>{activeJurisdiction.name}</strong>
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {JURISDICTION_PROFILES.map((j) => (
                      <button
                        key={j.id}
                        type="button"
                        onClick={() => setJurisdictionId(j.id)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                          jurisdictionId === j.id
                            ? 'bg-[#2E854E] text-white'
                            : isDark
                            ? 'bg-[#14261C] text-slate-300'
                            : 'bg-[#F0F4F0] text-[#4F5D52]'
                        }`}
                      >
                        {j.shortName}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Stream Filter Pills */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {[
                      { id: 'ALL', label: 'All Streams' },
                      { id: 'WET', label: 'Organic / Wet' },
                      { id: 'DRY', label: 'Recyclable / Dry' },
                      { id: 'MLP', label: 'General / MLP' },
                      { id: 'HAZARDOUS', label: 'Hazardous & E-Waste' },
                    ].map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setGuideCategoryFilter(f.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                          guideCategoryFilter === f.id
                            ? 'bg-[#2E854E] text-white'
                            : isDark
                            ? 'bg-[#14261C] text-slate-300 hover:bg-[#1E3629]'
                            : 'bg-[#F1F5F1] text-[#4F5D52] hover:bg-[#E4ECE5]'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  <input
                    type="text"
                    value={guideSearchQuery}
                    onChange={(e) => setGuideSearchQuery(e.target.value)}
                    placeholder="Filter household items (Hindi / English)..."
                    className={`border rounded-xl px-3.5 py-1.5 text-xs focus:outline-none w-full sm:w-64 ${
                      isDark
                        ? 'bg-[#09130D] border-[#213B2B] text-slate-100'
                        : 'bg-[#F8FAF8] border-[#DCE3DD] text-[#141E17]'
                    }`}
                  />
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr
                        className={`border-b text-[10px] font-mono uppercase ${
                          isDark
                            ? 'border-[#1E3327] bg-[#09130D] text-slate-400'
                            : 'border-[#E6EAE6] bg-[#F9FBF9] text-[#6E7B70]'
                        }`}
                      >
                        <th className="py-3 px-4">Waste Category</th>
                        <th className="py-3 px-4">Designated Bin / Compartment</th>
                        <th className="py-3 px-4">Bin Label</th>
                        <th className="py-3 px-4">Collection &amp; Preparation Rule</th>
                      </tr>
                    </thead>
                    <tbody
                      className={`divide-y ${
                        isDark ? 'divide-[#192B21]' : 'divide-[#F1F4F1]'
                      }`}
                    >
                      {Object.entries(activeJurisdiction.streams)
                        .filter(([cat]) => {
                          if (guideCategoryFilter === 'ALL') return true;
                          if (guideCategoryFilter === 'WET')
                            return cat === WasteCategory.WET_BIODEGRADABLE;
                          if (guideCategoryFilter === 'DRY')
                            return cat === WasteCategory.DRY_RECYCLABLE;
                          if (guideCategoryFilter === 'MLP')
                            return (
                              cat === WasteCategory.DRY_NON_RECYCLABLE ||
                              cat === WasteCategory.CONSTRUCTION_DEMOLITION
                            );
                          if (guideCategoryFilter === 'HAZARDOUS')
                            return (
                              cat === WasteCategory.DOMESTIC_HAZARDOUS ||
                              cat === WasteCategory.SANITARY_BIOMEDICAL ||
                              cat === WasteCategory.E_WASTE
                            );
                          return true;
                        })
                        .map(([cat, rule]) => (
                          <tr
                            key={cat}
                            className={isDark ? 'hover:bg-[#13231A]' : 'hover:bg-[#F9FBF9]'}
                          >
                            <td className={`py-3.5 px-4 font-bold ${primaryHeading}`}>{cat}</td>
                            <td className="py-3.5 px-4 font-semibold text-emerald-400">
                              {rule.binName}
                            </td>
                            <td className={`py-3.5 px-4 font-mono ${mutedText}`}>
                              {rule.binColorLabel}
                            </td>
                            <td className={`py-3.5 px-4 ${mutedText}`}>{rule.collectionNotes}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Indian Household Waste Material Encyclopedia Grid with Interactive "Test in Scanner" */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className={`font-display text-lg font-bold ${primaryHeading}`}>
                      Indian Household &amp; Commercial Waste Directory
                    </h3>
                    <p className={`text-xs ${mutedText}`}>
                      Click &ldquo;Test &amp; Classify Item&rdquo; on any card to run it through the active municipal rules engine
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {WASTE_ENCYCLOPEDIA.filter((item: WasteDirectoryEntry) => {
                    if (guideCategoryFilter !== 'ALL') {
                      if (
                        guideCategoryFilter === 'WET' &&
                        item.category !== WasteCategory.WET_BIODEGRADABLE
                      )
                        return false;
                      if (
                        guideCategoryFilter === 'DRY' &&
                        item.category !== WasteCategory.DRY_RECYCLABLE
                      )
                        return false;
                      if (
                        guideCategoryFilter === 'MLP' &&
                        item.category !== WasteCategory.DRY_NON_RECYCLABLE &&
                        item.category !== WasteCategory.CONSTRUCTION_DEMOLITION
                      )
                        return false;
                      if (
                        guideCategoryFilter === 'HAZARDOUS' &&
                        item.category !== WasteCategory.DOMESTIC_HAZARDOUS &&
                        item.category !== WasteCategory.SANITARY_BIOMEDICAL &&
                        item.category !== WasteCategory.E_WASTE
                      )
                        return false;
                    }
                    if (!guideSearchQuery.trim()) return true;
                    const q = guideSearchQuery.toLowerCase();
                    return (
                      item.name.toLowerCase().includes(q) ||
                      item.hindiVernacular.toLowerCase().includes(q) ||
                      item.material.toLowerCase().includes(q)
                    );
                  }).map((item: WasteDirectoryEntry) => {
                    const tag = getCategoryTagColors(item.category);
                    return (
                      <div
                        key={item.id}
                        className={`${surfaceCard} rounded-2xl p-5 flex flex-col justify-between space-y-4`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`text-[11px] font-semibold px-2 py-0.5 rounded ${tag.bg} ${tag.text}`}
                            >
                              {tag.label}
                            </span>
                            <span className={`text-[11px] font-mono ${mutedText}`}>
                              {item.recyclability}
                            </span>
                          </div>
                          <h4 className={`font-display text-sm font-bold ${primaryHeading}`}>
                            {item.name}
                          </h4>
                          <div className="text-[11px] text-emerald-400 font-medium">
                            Vernacular: {item.hindiVernacular}
                          </div>
                          <p className={`text-xs leading-relaxed ${mutedText}`}>
                            {item.prepInstruction}
                          </p>
                          {item.hazardNote && (
                            <div className="p-2.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-[11px] text-rose-300">
                              {item.hazardNote}
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            handleInspectEncyclopediaOrCustomItem(
                              item.name,
                              item.material,
                              item.category
                            )
                          }
                          className={`w-full py-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                            isDark
                              ? 'bg-[#13251B] hover:bg-[#1B3426] border-[#244331] text-emerald-300'
                              : 'bg-[#F2F7F3] hover:bg-[#E4EFE6] border-[#CFE0D1] text-[#1E5E36]'
                          }`}
                        >
                          <Scan className="w-3.5 h-3.5" />
                          <span>Test &amp; Classify Item</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* ===================================================================
              PAGE 4: WASTE ACTIVITY (Full Visual Audit Log + Category Filter + CSV Export)
             =================================================================== */}
          {activeSection === 'activity' && (
            <motion.div
              key="view-activity"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`${surfaceCard} rounded-2xl p-6 space-y-5`}
            >
              <div
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b ${
                  isDark ? 'border-[#1E3327]' : 'border-[#EDF1ED]'
                }`}
              >
                <div>
                  <h2 className={`font-display text-xl font-bold ${primaryHeading}`}>
                    Waste Activity &amp; Visual Audit Log ({historyLog.length})
                  </h2>
                  <p className={`text-xs mt-0.5 ${mutedText}`}>
                    Stores the captured image frame and your exact local device timestamp for every classification
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <select
                    value={auditCategoryFilter}
                    onChange={(e) => setAuditCategoryFilter(e.target.value)}
                    className={`border rounded-xl px-3 py-2 text-xs focus:outline-none ${
                      isDark
                        ? 'bg-[#09130D] border-[#233E2E] text-slate-100'
                        : 'bg-[#F7F9F7] border-[#DCE3DD] text-[#141E17]'
                    }`}
                  >
                    <option value="ALL">All Categories</option>
                    <option value={WasteCategory.WET_BIODEGRADABLE}>Wet Biodegradable</option>
                    <option value={WasteCategory.DRY_RECYCLABLE}>Dry Recyclable</option>
                    <option value={WasteCategory.DRY_NON_RECYCLABLE}>Dry Non-Recyclable / MLP</option>
                    <option value={WasteCategory.DOMESTIC_HAZARDOUS}>Domestic Hazardous</option>
                    <option value={WasteCategory.SANITARY_BIOMEDICAL}>Sanitary / Bio-Medical</option>
                    <option value={WasteCategory.E_WASTE}>E-Waste</option>
                  </select>

                  <input
                    type="text"
                    value={auditSearchQuery}
                    onChange={(e) => setAuditSearchQuery(e.target.value)}
                    placeholder="Search item or Scan ID..."
                    className={`border rounded-xl px-3.5 py-2 text-xs focus:outline-none ${
                      isDark
                        ? 'bg-[#09130D] border-[#233E2E] text-slate-100 focus:border-emerald-500'
                        : 'bg-[#F7F9F7] border-[#DCE3DD] text-[#141E17] focus:border-[#236B3E]'
                    }`}
                  />
                  {historyLog.length > 0 && (
                    <>
                      <button
                        type="button"
                        onClick={handleExportAuditCsv}
                        className="px-3.5 py-2 rounded-xl bg-[#2E854E] hover:bg-[#236B3E] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Export CSV</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setHistoryLog([]);
                          localStorage.removeItem('trashvision_audit_log_v2');
                        }}
                        className="px-3 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-xs font-semibold text-rose-400 flex items-center gap-1.5 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Clear All</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr
                      className={`border-b text-[10px] font-semibold tracking-wider uppercase ${
                        isDark
                          ? 'border-[#1E3327] text-slate-400'
                          : 'border-[#EDF1ED] text-[#88948A]'
                      }`}
                    >
                      <th className="py-3 px-3">Saved Image Frame</th>
                      <th className="py-3 px-3">Scan ID &amp; Local Timestamp</th>
                      <th className="py-3 px-3">Detected Items</th>
                      <th className="py-3 px-3">Category</th>
                      <th className="py-3 px-3">Jurisdiction</th>
                      <th className="py-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody
                    className={`divide-y text-xs ${
                      isDark ? 'divide-[#192B21]' : 'divide-[#F1F4F1]'
                    }`}
                  >
                    {historyLog
                      .filter((entry) => {
                        if (
                          auditCategoryFilter !== 'ALL' &&
                          !entry.items.some((i) => i.wasteCategory === auditCategoryFilter)
                        ) {
                          return false;
                        }
                        if (!auditSearchQuery.trim()) return true;
                        const q = auditSearchQuery.toLowerCase();
                        return (
                          entry.analysisId.toLowerCase().includes(q) ||
                          entry.items.some((i) => i.itemName.toLowerCase().includes(q))
                        );
                      })
                      .map((entry) => {
                        const first = entry.items[0];
                        const tag = first
                          ? getCategoryTagColors(first.wasteCategory)
                          : getCategoryTagColors(WasteCategory.DRY_RECYCLABLE);
                        return (
                          <tr
                            key={entry.analysisId}
                            className={isDark ? 'hover:bg-[#13231A]' : 'hover:bg-[#F9FBF9]'}
                          >
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-3">
                                {entry.imageDataUrl ? (
                                  <img
                                    src={entry.imageDataUrl}
                                    alt={entry.analysisId}
                                    referrerPolicy="no-referrer"
                                    className="w-16 h-12 rounded-lg object-cover border border-emerald-500/30 shrink-0"
                                  />
                                ) : (
                                  <div className="w-16 h-12 rounded-lg bg-emerald-500/20 flex items-center justify-center text-[10px] text-emerald-400">
                                    Frame
                                  </div>
                                )}
                                <span className={`text-[11px] max-w-[140px] truncate ${mutedText}`}>
                                  {entry.imageSourceLabel || 'Captured Frame'}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              <div className={`font-mono font-bold ${primaryHeading}`}>
                                {entry.analysisId}
                              </div>
                              <div className="font-mono text-[11px] text-emerald-400 tabular-nums">
                                {entry.timestamp}
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              <div className={`font-semibold ${primaryHeading}`}>
                                {entry.items.length} item(s)
                              </div>
                              <div className={`text-[11px] max-w-xs truncate ${mutedText}`}>
                                {entry.items.map((i) => i.itemName).join(', ')}
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              <span
                                className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded ${tag.bg} ${tag.text}`}
                              >
                                {tag.label}
                              </span>
                            </td>
                            <td className={`py-3 px-3 ${mutedText}`}>
                              {entry.jurisdiction.shortName}
                            </td>
                            <td className="py-3 px-3 text-right">
                              <div className="inline-flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleRestoreFromAuditLog(entry)}
                                  className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-semibold cursor-pointer"
                                >
                                  Inspect
                                </button>
                                <button
                                  type="button"
                                  title="Delete entry"
                                  onClick={(e) => handleDeleteAuditEntry(entry.analysisId, e)}
                                  className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* ===================================================================
              PAGE 5: MY IMPACT (Interactive Diversion Goal, Weight Logger & Environmental Equivalents)
             =================================================================== */}
          {activeSection === 'impact' && (
            <motion.div
              key="view-impact"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className={`${sageHighlightCard} rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6`}>
                <div className="space-y-2 max-w-xl">
                  <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                    Swachh Bharat Citizen Impact Ledger
                  </span>
                  <h2 className={`font-display text-2xl font-bold ${primaryHeading}`}>
                    {kpiWasteDiverted} kg diverted from municipal landfills
                  </h2>
                  <p className={`text-xs sm:text-sm ${mutedText}`}>
                    By separating wet organic waste and rinsing dry recyclables before disposal, you
                    prevent cross-stream contamination at Material Recovery Facilities (MRFs) and
                    protect sanitation workers from unflagged hazards.
                  </p>
                </div>
                <div
                  className={`rounded-2xl p-5 border text-center shrink-0 min-w-[200px] ${
                    isDark ? 'bg-[#0A150F] border-[#234732]' : 'bg-white border-[#D4E4D6]'
                  }`}
                >
                  <div className={`text-xs ${mutedText}`}>Monthly Goal Progress</div>
                  <div className="font-display text-3xl font-bold text-emerald-400 my-1 tabular-nums">
                    {diversionGoalPercent}%
                  </div>
                  <div className={`text-[11px] tabular-nums ${mutedText}`}>
                    {kpiWasteDiverted} / {monthlyGoalKg}.0 kg target
                  </div>
                </div>
              </div>

              {/* Environmental Equivalents Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className={`${surfaceCard} rounded-2xl p-5 space-y-1.5`}>
                  <div className={`text-xs ${mutedText}`}>Equivalent Tree Seedlings Grown</div>
                  <div className={`font-display text-2xl font-bold tabular-nums ${primaryHeading}`}>
                    {(Number(kpiCo2Avoided) * 0.16).toFixed(1)} trees
                  </div>
                  <div className="text-[11px] text-emerald-400">
                    Based on methane &amp; CO₂ avoided via organic composting
                  </div>
                </div>
                <div className={`${surfaceCard} rounded-2xl p-5 space-y-1.5`}>
                  <div className={`text-xs ${mutedText}`}>Virgin Plastic &amp; Paper Energy Saved</div>
                  <div className={`font-display text-2xl font-bold tabular-nums ${primaryHeading}`}>
                    {(Number(kpiWasteDiverted) * 3.8).toFixed(0)} kWh
                  </div>
                  <div className="text-[11px] text-sky-400">
                    Recovered through clean dry MRF sorting
                  </div>
                </div>
                <div className={`${surfaceCard} rounded-2xl p-5 space-y-1.5`}>
                  <div className={`text-xs ${mutedText}`}>Organic Compost Yield Potential</div>
                  <div className={`font-display text-2xl font-bold tabular-nums ${primaryHeading}`}>
                    {(Number(kpiWasteDiverted) * 0.36).toFixed(1)} kg
                  </div>
                  <div className="text-[11px] text-emerald-400">
                    Nutrient-rich soil amendment for urban gardens
                  </div>
                </div>
              </div>

              {/* Stream Composition Analytics + Interactive Weight Logger & Goal Customizer */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className={`${surfaceCard} rounded-2xl p-6 space-y-4`}>
                  <h3 className={`font-display text-base font-bold ${primaryHeading}`}>
                    Diverted Material Stream Distribution
                  </h3>
                  <div className="space-y-3">
                    {[
                      {
                        label: 'Dry Recyclables (PET, Paper, Metal, Glass)',
                        pct: 48,
                        color: 'bg-sky-500',
                      },
                      {
                        label: 'Wet Biodegradable (Compost & Bio-CNG Feedstock)',
                        pct: 36,
                        color: 'bg-emerald-500',
                      },
                      {
                        label: 'Low-Value MLP (Cement Co-Processing)',
                        pct: 11,
                        color: 'bg-amber-500',
                      },
                      {
                        label: 'Domestic Hazardous, Sanitary & E-Waste Safe Routing',
                        pct: 5,
                        color: 'bg-rose-500',
                      },
                    ].map((s) => (
                      <div key={s.label} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className={primaryHeading}>{s.label}</span>
                          <span className="font-mono font-bold tabular-nums">{s.pct}%</span>
                        </div>
                        <div
                          className={`w-full h-2 rounded-full overflow-hidden ${
                            isDark ? 'bg-[#17291F]' : 'bg-[#EAF0EA]'
                          }`}
                        >
                          <div
                            className={`h-full rounded-full ${s.color}`}
                            style={{ width: `${s.pct}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={`${surfaceCard} rounded-2xl p-6 flex flex-col justify-between space-y-5`}>
                  <div className="space-y-3">
                    <h3 className={`font-display text-base font-bold ${primaryHeading}`}>
                      Log Household Batch Weight &amp; Adjust Target
                    </h3>
                    <p className={`text-xs ${mutedText}`}>
                      Weighed your segregated wet/dry batch before handing over to the municipal collection vehicle? Log it below to update your diversion ledger:
                    </p>

                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.5"
                        min="0.1"
                        max="100"
                        value={manualLogKgInput}
                        onChange={(e) => setManualLogKgInput(e.target.value)}
                        className={`w-28 border rounded-xl px-3 py-2 text-xs font-mono focus:outline-none ${
                          isDark
                            ? 'bg-[#09130D] border-[#233E2E] text-slate-100'
                            : 'bg-[#F8FAF8] border-[#DCE3DD] text-[#141E17]'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const val = parseFloat(manualLogKgInput);
                          if (!isNaN(val) && val > 0) {
                            const next = Number((bonusDivertedKg + val).toFixed(1));
                            setBonusDivertedKg(next);
                            try {
                              localStorage.setItem('trashvision_bonus_kg', String(next));
                            } catch {
                              // ignore
                            }
                          }
                        }}
                        className="px-4 py-2 rounded-xl bg-[#2E854E] hover:bg-[#236B3E] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Segregated Weight (kg)</span>
                      </button>
                    </div>

                    <div className="pt-2 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className={mutedText}>Monthly Diversion Goal Target:</span>
                        <span className={`font-mono font-bold ${primaryHeading}`}>
                          {monthlyGoalKg} kg / month
                        </span>
                      </div>
                      <input
                        type="range"
                        min={15}
                        max={150}
                        step={5}
                        value={monthlyGoalKg}
                        onChange={(e) => {
                          const g = Number(e.target.value);
                          setMonthlyGoalKg(g);
                          try {
                            localStorage.setItem('trashvision_goal_kg', String(g));
                          } catch {
                            // ignore
                          }
                        }}
                        className="w-full accent-emerald-500 cursor-pointer"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleExportAuditCsv}
                    className="w-full py-2.5 rounded-xl bg-[#15281D] hover:bg-[#1D3628] border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>Download Full CSV Compliance Ledger ({historyLog.length} Scans)</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ===================================================================
              PAGE 6: COLLECTION POINTS (Interactive City Filter + Pickup/Drop-Off Booking System)
             =================================================================== */}
          {activeSection === 'collection' && (
            <motion.div
              key="view-collection"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className={`font-display text-xl font-bold ${primaryHeading}`}>
                    Authorized Municipal &amp; Producer Take-Back Collection Points
                  </h2>
                  <p className={`text-xs mt-0.5 ${mutedText}`}>
                    Verified drop-off facilities for E-Waste, Domestic Hazardous Waste, and Dry Recyclables (DWCC / MRF)
                  </p>
                </div>

                {/* City Filter Pills */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    'ALL',
                    'Bengaluru (BBMP)',
                    'Indore (IMC)',
                    'Delhi (MCD)',
                    'Mumbai (BMC)',
                    'National / All ULBs',
                  ].map((city) => (
                    <button
                      key={city}
                      type="button"
                      onClick={() => setCollectionCityFilter(city)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                        collectionCityFilter === city
                          ? 'bg-[#2E854E] text-white'
                          : isDark
                          ? 'bg-[#13241A] text-slate-300 hover:bg-[#1A3124]'
                          : 'bg-white border border-[#DCE3DD] text-[#4F5D52]'
                      }`}
                    >
                      {city === 'ALL' ? 'All Cities' : city}
                    </button>
                  ))}
                </div>
              </div>

              {/* Active Scheduled Drop-Off / Pickup Bookings */}
              {pickupBookings.length > 0 && (
                <div className={`${sageHighlightCard} rounded-2xl p-5 space-y-3`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <h3 className={`font-display text-sm font-bold ${primaryHeading}`}>
                        Your Scheduled Drop-Off &amp; Doorstep Pickup Bookings ({pickupBookings.length})
                      </h3>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {pickupBookings.map((b) => (
                      <div
                        key={b.id}
                        className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 text-xs ${
                          isDark
                            ? 'bg-[#0A150F] border-[#234732]'
                            : 'bg-white border-[#D4E4D6]'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-emerald-400">{b.id}</span>
                            <span className={`text-[11px] ${mutedText}`}>{b.city}</span>
                          </div>
                          <div className={`font-bold ${primaryHeading}`}>{b.facilityName}</div>
                          <div className={mutedText}>
                            {b.scheduledDate} · {b.timeSlot} · Est. {b.estimatedWeightKg} kg
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const next = pickupBookings.filter((x) => x.id !== b.id);
                            setPickupBookings(next);
                            localStorage.setItem('trashvision_pickup_bookings', JSON.stringify(next));
                          }}
                          className="text-rose-400 hover:underline text-[11px] cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {COLLECTION_CENTERS.filter(
                  (c) => collectionCityFilter === 'ALL' || c.city === collectionCityFilter
                ).map((center) => (
                  <div
                    key={center.id}
                    className={`${surfaceCard} rounded-2xl p-5 flex flex-col justify-between space-y-4`}
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-emerald-400 bg-emerald-500/15 px-2.5 py-0.5 rounded">
                          {center.type}
                        </span>
                        <span className={`font-medium ${mutedText}`}>{center.city}</span>
                      </div>
                      <h3 className={`font-display text-base font-bold ${primaryHeading}`}>
                        {center.name}
                      </h3>
                      <p className={`text-xs flex items-center gap-1.5 ${mutedText}`}>
                        <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>{center.address}</span>
                      </p>
                      <p className={`text-xs flex items-center gap-1.5 ${mutedText}`}>
                        <Clock className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>{center.hours}</span>
                      </p>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {center.acceptedStreams.map((stream) => (
                          <span
                            key={stream}
                            className={`text-[10px] px-2 py-0.5 rounded border ${
                              isDark
                                ? 'bg-[#09130D] border-[#1F3829] text-slate-300'
                                : 'bg-[#F5F8F5] border-[#DCE5DD] text-[#3A473D]'
                            }`}
                          >
                            {stream}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div
                      className={`pt-3 border-t flex flex-wrap items-center justify-between gap-2 text-xs ${
                        isDark ? 'border-[#1E3327]' : 'border-[#EDF1ED]'
                      }`}
                    >
                      <span className={`flex items-center gap-1 font-medium ${mutedText}`}>
                        <PhoneCall className="w-3.5 h-3.5 text-emerald-500" />
                        <span>{center.contact}</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setBookingCenter(center)}
                          className="px-3 py-1.5 rounded-lg bg-[#2E854E] hover:bg-[#236B3E] text-white font-semibold cursor-pointer"
                        >
                          Schedule Drop-Off / Pickup
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ===================================================================
              PAGE 7: ABOUT & CPCB / BBMP / INDORE IMC 6-BIN METHODOLOGY
             =================================================================== */}
          {activeSection === 'about' && (
            <motion.div
              key="view-about"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className={`${sageHighlightCard} rounded-2xl p-6 space-y-3`}>
                <span className="text-xs font-mono font-semibold uppercase text-emerald-400">
                  Architecture &amp; Regulatory Compliance
                </span>
                <h2 className={`font-display text-2xl font-bold ${primaryHeading}`}>
                  Hybrid Multimodal Perception + Deterministic Municipal Rules Engine
                </h2>
                <p className={`text-xs sm:text-sm leading-relaxed ${mutedText}`}>
                  TrashVision separates <strong>Visual Attribute Perception</strong> from{' '}
                  <strong>Regulatory Disposal Rules</strong>. Instead of allowing an AI model to
                  guess arbitrary bin colors, TrashVision extracts physical evidence (material code,
                  resin markings, food/chemical contamination, and laceration/fire hazards) and
                  evaluates them through a deterministic TypeScript rules engine calibrated for
                  India&apos;s Swachh Bharat Mission 2.0.
                </p>
              </div>

              {/* 3-Column Comparison of CPCB, BBMP, and Indore IMC 6-Bin */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className={`${surfaceCard} rounded-2xl p-5 space-y-3`}>
                  <div className="text-xs font-mono font-semibold text-emerald-400">
                    NATIONAL BASELINE
                  </div>
                  <h3 className={`font-display text-base font-bold ${primaryHeading}`}>
                    CPCB SWM Rules 2016 (4-Stream)
                  </h3>
                  <ul className={`text-xs space-y-2 ${mutedText}`}>
                    <li>• <strong>Green Bin:</strong> Wet Biodegradable kitchen &amp; garden waste</li>
                    <li>• <strong>Blue Bin:</strong> Clean, dry recyclable plastic, paper, metal, glass</li>
                    <li>• <strong>Black Bin:</strong> Domestic Hazardous (medicines, paint, batteries, sharps)</li>
                    <li>• <strong>Red Bin:</strong> Sanitary &amp; bio-soiled hygiene waste wrapped securely</li>
                  </ul>
                  <button
                    type="button"
                    onClick={() => {
                      setJurisdictionId('cpcb_swm_2016');
                      setActiveSection('guide');
                    }}
                    className="text-xs font-semibold text-emerald-400 hover:underline cursor-pointer pt-1"
                  >
                    Activate CPCB Profile →
                  </button>
                </div>

                <div className={`${surfaceCard} rounded-2xl p-5 space-y-3`}>
                  <div className="text-xs font-mono font-semibold text-sky-400">
                    BENGALURU MUNICIPAL
                  </div>
                  <h3 className={`font-display text-base font-bold ${primaryHeading}`}>
                    Bengaluru BBMP (2-Bin + DWCC)
                  </h3>
                  <ul className={`text-xs space-y-2 ${mutedText}`}>
                    <li>• <strong>Green Bin (Daily):</strong> Wet organic kitchen &amp; garden biomass</li>
                    <li>• <strong>Blue Bag / Bin (DWCC):</strong> Rinsed dry recyclables &amp; flattened MLP</li>
                    <li>• <strong>Red Bin (Daily):</strong> Wrapped sanitary &amp; domestic medical sharps</li>
                    <li>• <strong>Authorized PRO Kiosks:</strong> E-waste &amp; lithium/alkaline batteries</li>
                  </ul>
                  <button
                    type="button"
                    onClick={() => {
                      setJurisdictionId('bengaluru_bbmp');
                      setActiveSection('guide');
                    }}
                    className="text-xs font-semibold text-sky-400 hover:underline cursor-pointer pt-1"
                  >
                    Activate Bengaluru BBMP Profile →
                  </button>
                </div>

                <div className={`${surfaceCard} rounded-2xl p-5 space-y-3`}>
                  <div className="text-xs font-mono font-semibold text-amber-400">
                    INDORE SMART CITY
                  </div>
                  <h3 className={`font-display text-base font-bold ${primaryHeading}`}>
                    Indore IMC (6-Bin Compartment)
                  </h3>
                  <ul className={`text-xs space-y-2 ${mutedText}`}>
                    <li>• <strong>Compartment 1 &amp; 2:</strong> Wet Organic (Green) &amp; Dry Recyclable (Blue)</li>
                    <li>• <strong>Compartment 3:</strong> Non-Recyclable Plastic &amp; MLP Wrappers (Grey)</li>
                    <li>• <strong>Compartment 4 &amp; 5:</strong> Domestic E-Waste &amp; Domestic Hazardous (Black)</li>
                    <li>• <strong>Compartment 6:</strong> Sanitary &amp; Yellow/Red Bio-Medical Stream</li>
                  </ul>
                  <button
                    type="button"
                    onClick={() => {
                      setJurisdictionId('indore_imc');
                      setActiveSection('guide');
                    }}
                    className="text-xs font-semibold text-amber-400 hover:underline cursor-pointer pt-1"
                  >
                    Activate Indore IMC 6-Bin Profile →
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ===================================================================
              PAGE 8: HELP CENTER & INTERACTIVE MUNICIPAL FAQ
             =================================================================== */}
          {activeSection === 'faq' && (
            <motion.div
              key="view-faq"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* Interactive "Ask the Municipal Rule Engine" Tool */}
              <div className={`${sageHighlightCard} rounded-2xl p-6 space-y-4`}>
                <div>
                  <h2 className={`font-display text-xl font-bold ${primaryHeading}`}>
                    Ask the Municipal Sorting Rule Engine
                  </h2>
                  <p className={`text-xs mt-0.5 ${mutedText}`}>
                    Type any household item or waste scenario below to get an instant rule-verified disposal answer for{' '}
                    <strong>{activeJurisdiction.name}</strong>:
                  </p>
                </div>

                <form onSubmit={handleAskRuleEngineQuestion} className="flex flex-col sm:flex-row gap-2.5">
                  <input
                    type="text"
                    value={faqRuleQuestion}
                    onChange={(e) => setFaqRuleQuestion(e.target.value)}
                    placeholder="e.g., Where do I throw expired cough syrup bottles or aluminum foil?"
                    className={`flex-1 border rounded-xl px-4 py-2.5 text-xs focus:outline-none ${
                      isDark
                        ? 'bg-[#09130D] border-[#234732] text-slate-100'
                        : 'bg-white border-[#C8DEC9] text-[#141E17]'
                    }`}
                  />
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-[#2E854E] hover:bg-[#236B3E] text-white text-xs font-semibold cursor-pointer shrink-0"
                  >
                    Check Disposal Rule
                  </button>
                </form>

                {faqRuleAnswer && (
                  <div
                    className={`p-4 rounded-xl border space-y-2 text-xs ${
                      isDark ? 'bg-[#09130D] border-[#234732]' : 'bg-white border-[#D4E4D6]'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className={`font-bold ${primaryHeading}`}>{faqRuleAnswer.title}</span>
                      <span className="px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-semibold">
                        {faqRuleAnswer.binBadge}
                      </span>
                    </div>
                    <p className={mutedText}>{faqRuleAnswer.guidance}</p>
                    {faqRuleAnswer.safety && (
                      <p className="text-rose-400 font-medium">{faqRuleAnswer.safety}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Accordion FAQs */}
              <div className="space-y-3">
                <h3 className={`font-display text-base font-bold ${primaryHeading}`}>
                  Frequently Asked Questions
                </h3>
                {FAQ_ITEMS.map((faq) => {
                  const isOpen = openFaqId === faq.id;
                  return (
                    <div key={faq.id} className={`${surfaceCard} rounded-2xl overflow-hidden`}>
                      <button
                        type="button"
                        onClick={() => setOpenFaqId(isOpen ? '' : faq.id)}
                        className="w-full p-5 text-left flex items-center justify-between gap-4 cursor-pointer"
                      >
                        <span className={`font-display text-sm font-bold ${primaryHeading}`}>
                          {faq.question}
                        </span>
                        {isOpen ? (
                          <ChevronDown className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <ChevronRight className={`w-4 h-4 shrink-0 ${mutedText}`} />
                        )}
                      </button>
                      {isOpen && (
                        <div
                          className={`px-5 pb-5 pt-1 text-xs leading-relaxed border-t ${
                            isDark ? 'border-[#1B3124]' : 'border-[#EDF1ED]'
                          } ${mutedText}`}
                        >
                          {faq.answer}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ===================================================================
              PAGE 9: SETTINGS & WORKSPACE PREFERENCES
             =================================================================== */}
          {activeSection === 'settings' && (
            <motion.div
              key="view-settings"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className={`${surfaceCard} rounded-2xl p-6 space-y-5`}>
                <div>
                  <h2 className={`font-display text-xl font-bold ${primaryHeading}`}>
                    Workspace &amp; Municipal Profile Settings
                  </h2>
                  <p className={`text-xs mt-0.5 ${mutedText}`}>
                    Customize your profile name, default Urban Local Body (ULB) rulebook, camera behavior, and theme
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className={`block text-xs font-semibold ${primaryHeading}`}>
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={userName}
                      onChange={(e) => {
                        setUserName(e.target.value);
                        try {
                          localStorage.setItem('trashvision_user_name', e.target.value);
                        } catch {
                          // ignore
                        }
                      }}
                      className={`w-full border rounded-xl px-3.5 py-2 text-xs focus:outline-none ${
                        isDark
                          ? 'bg-[#09130D] border-[#213B2B] text-slate-100'
                          : 'bg-[#F8FAF8] border-[#DCE3DD] text-[#141E17]'
                      }`}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className={`block text-xs font-semibold ${primaryHeading}`}>
                      Default Municipal Jurisdiction (ULB)
                    </label>
                    <select
                      value={jurisdictionId}
                      onChange={(e) => setJurisdictionId(e.target.value)}
                      className={`w-full border rounded-xl px-3.5 py-2 text-xs focus:outline-none ${
                        isDark
                          ? 'bg-[#09130D] border-[#213B2B] text-slate-100'
                          : 'bg-[#F8FAF8] border-[#DCE3DD] text-[#141E17]'
                      }`}
                    >
                      {JURISDICTION_PROFILES.map((j) => (
                        <option key={j.id} value={j.id}>
                          {j.name} ({j.authority})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className={`block text-xs font-semibold ${primaryHeading}`}>
                      Appearance Theme
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsDark(true)}
                        className={`px-4 py-2 rounded-xl border text-xs font-semibold flex items-center gap-2 cursor-pointer ${
                          isDark
                            ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                            : 'bg-[#F4F7F4] border-[#DCE3DD] text-[#4F5D52]'
                        }`}
                      >
                        <Moon className="w-3.5 h-3.5" />
                        <span>Eco-Tech Dark (3D Spheres)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsDark(false)}
                        className={`px-4 py-2 rounded-xl border text-xs font-semibold flex items-center gap-2 cursor-pointer ${
                          !isDark
                            ? 'bg-[#EAF3EC] border-[#236B3E] text-[#1E5E36]'
                            : 'bg-[#09130D] border-[#213B2B] text-slate-400'
                        }`}
                      >
                        <Sun className="w-3.5 h-3.5" />
                        <span>Botanical Light</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className={`block text-xs font-semibold ${primaryHeading}`}>
                      Webcam Default Mirroring
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setMirrorWebcam((m) => !m)}
                        className={`px-4 py-2 rounded-xl border text-xs font-semibold flex items-center gap-2 cursor-pointer ${
                          isDark
                            ? 'bg-[#09130D] border-[#213B2B] text-slate-200'
                            : 'bg-[#F8FAF8] border-[#DCE3DD] text-[#141E17]'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{mirrorWebcam ? 'Mirrored Preview Enabled' : 'Standard Preview Enabled'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </main>

        {/* Structured Multi-Page Website Footer */}
        <footer
          className={`mt-auto border-t px-6 lg:px-10 py-5 text-xs ${
            isDark
              ? 'bg-[#060E09]/80 border-[#16281D] text-[#7D9485]'
              : 'bg-white/80 border-[#E4EBE4] text-[#606C62]'
          }`}
        >
          <div className="max-w-[1180px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className={`font-display font-bold ${primaryHeading}`}>TrashVision</span>
              <span>· Swachh Bharat Mission (SWM Rules 2016, BBMP &amp; Indore IMC 6-Bin)</span>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              {(
                [
                  { id: 'overview', label: 'Overview' },
                  { id: 'identify', label: 'Identify Waste' },
                  { id: 'guide', label: 'Sorting Guide' },
                  { id: 'collection', label: 'Collection Points' },
                  { id: 'about', label: 'About & Rules' },
                  { id: 'faq', label: 'Help & FAQ' },
                  { id: 'settings', label: 'Settings' },
                ] as { id: PageRoute; label: string }[]
              ).map((link) => (
                <button
                  key={link.id}
                  type="button"
                  onClick={() => setActiveSection(link.id)}
                  className="hover:underline cursor-pointer"
                >
                  {link.label}
                </button>
              ))}
            </div>
          </div>
        </footer>
      </div>

      {/* =====================================================================
          SCHEDULE DROP-OFF / DOORSTEP PICKUP MODAL
         ===================================================================== */}
      <AnimatePresence>
        {bookingCenter && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => setBookingCenter(null)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl space-y-4 ${
                isDark
                  ? 'bg-[#0C1811] border-[#234330] text-slate-100'
                  : 'bg-white border-[#DCE3DD] text-[#141E17]'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-[10px] font-mono uppercase text-emerald-400">
                    Authorized Municipal Handover
                  </span>
                  <h3 className="font-display text-base font-bold mt-0.5">
                    {bookingCenter.name}
                  </h3>
                  <p className={`text-xs ${mutedText}`}>{bookingCenter.address}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setBookingCenter(null)}
                  className="p-1 rounded-lg hover:bg-emerald-500/10 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreatePickupBooking} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold mb-1">Preferred Handover Date</label>
                  <input
                    type="date"
                    required
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                    className={`w-full border rounded-xl px-3 py-2 ${
                      isDark
                        ? 'bg-[#08110C] border-[#213B2B] text-slate-100'
                        : 'bg-[#F8FAF8] border-[#DCE3DD]'
                    }`}
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Time Slot</label>
                  <select
                    value={bookingSlot}
                    onChange={(e) => setBookingSlot(e.target.value)}
                    className={`w-full border rounded-xl px-3 py-2 ${
                      isDark
                        ? 'bg-[#08110C] border-[#213B2B] text-slate-100'
                        : 'bg-[#F8FAF8] border-[#DCE3DD]'
                    }`}
                  >
                    <option>08:30 AM – 10:30 AM</option>
                    <option>09:30 AM – 11:30 AM</option>
                    <option>02:00 PM – 04:00 PM</option>
                    <option>04:00 PM – 06:00 PM</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold mb-1">Est. Weight (kg)</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      required
                      value={bookingWeight}
                      onChange={(e) => setBookingWeight(e.target.value)}
                      className={`w-full border rounded-xl px-3 py-2 ${
                        isDark
                          ? 'bg-[#08110C] border-[#213B2B] text-slate-100'
                          : 'bg-[#F8FAF8] border-[#DCE3DD]'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Contact Number</label>
                    <input
                      type="text"
                      required
                      value={bookingPhone}
                      onChange={(e) => setBookingPhone(e.target.value)}
                      className={`w-full border rounded-xl px-3 py-2 ${
                        isDark
                          ? 'bg-[#08110C] border-[#213B2B] text-slate-100'
                          : 'bg-[#F8FAF8] border-[#DCE3DD]'
                      }`}
                    />
                  </div>
                </div>
                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setBookingCenter(null)}
                    className="px-4 py-2 rounded-xl border border-slate-600/40 text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-[#2E854E] hover:bg-[#236B3E] text-white font-semibold cursor-pointer"
                  >
                    Confirm Slot
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =====================================================================
          COMMAND PALETTE & INSTANT WASTE ENCYCLOPEDIA SEARCH MODAL (⌘K)
         ===================================================================== */}
      <AnimatePresence>
        {isCommandModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-start justify-center pt-20 px-4"
            onClick={() => setIsCommandModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-xl rounded-2xl border shadow-2xl overflow-hidden ${
                isDark
                  ? 'bg-[#0C1811] border-[#254131] text-slate-100'
                  : 'bg-white border-[#DCE3DD] text-[#141E17]'
              }`}
            >
              <div
                className={`p-4 border-b flex items-center gap-3 ${
                  isDark ? 'border-[#1E3327]' : 'border-[#EDF1ED]'
                }`}
              >
                <Search className="w-4 h-4 text-emerald-500 shrink-0" />
                <input
                  type="text"
                  autoFocus
                  value={commandQuery}
                  onChange={(e) => setCommandQuery(e.target.value)}
                  placeholder="Search waste item to classify (e.g., Tetra Pak, Pizza Box, CFL, Battery, Dawai)..."
                  className="w-full bg-transparent text-sm focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setIsCommandModalOpen(false)}
                  className="p-1 rounded-lg hover:bg-emerald-500/10 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="max-h-96 overflow-y-auto p-3 space-y-2">
                {WASTE_ENCYCLOPEDIA.filter((item) => {
                  if (!commandQuery.trim()) return true;
                  const q = commandQuery.toLowerCase();
                  return (
                    item.name.toLowerCase().includes(q) ||
                    item.hindiVernacular.toLowerCase().includes(q) ||
                    item.material.toLowerCase().includes(q) ||
                    item.category.toLowerCase().includes(q)
                  );
                }).map((item) => {
                  const tag = getCategoryTagColors(item.category);
                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        setIsCommandModalOpen(false);
                        handleInspectEncyclopediaOrCustomItem(
                          item.name,
                          item.material,
                          item.category
                        );
                      }}
                      className={`p-3 rounded-xl border transition-colors cursor-pointer ${
                        isDark
                          ? 'bg-[#112118] border-[#1E3327] hover:border-emerald-500/50'
                          : 'bg-[#F8FAF8] border-[#E6ECE6] hover:border-[#236B3E]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-display text-xs font-bold">{item.name}</span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded ${tag.bg} ${tag.text}`}
                        >
                          {tag.label}
                        </span>
                      </div>
                      <div className="text-[11px] text-emerald-400 mt-0.5">
                        {item.hindiVernacular} · {item.material}
                      </div>
                      <p className={`text-xs mt-1 ${mutedText}`}>{item.prepInstruction}</p>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
