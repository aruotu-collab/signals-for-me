// Re-export core types and the React hook (provided via DriverSettingsProvider).
export {
  DEFAULT_SETTINGS,
  type DriverSettings,
  normalizeDriverSettings,
  readLocalDriverSettings,
} from "@/lib/shiply/driverSettingsCore";
export { useDriverSettings } from "@/components/DriverSettingsProvider";
