// Debounce utility function
export function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Input masking for numbers only
export function maskNumericInput(value: string): string {
  return value.replace(/[^0-9]/g, "");
}

// Calculate time remaining estimate
export function calculateTimeRemaining(currentStep: number, totalSteps: number): number {
  const averageTimePerStep = 2; // minutes
  const remainingSteps = totalSteps - currentStep + 1;
  return remainingSteps * averageTimePerStep;
}

// Save form data to localStorage
export function saveFormData(data: Record<string, any>): void {
  try {
    localStorage.setItem("visaFormData", JSON.stringify(data));
    localStorage.setItem("visaFormTimestamp", Date.now().toString());
  } catch (error) {
    console.error("Failed to save form data:", error);
  }
}

// Load form data from localStorage
export function loadFormData(): Record<string, any> | null {
  try {
    const data = localStorage.getItem("visaFormData");
    const timestamp = localStorage.getItem("visaFormTimestamp");
    
    if (!data || !timestamp) return null;
    
    // Check if data is older than 7 days
    const daysSinceSave = (Date.now() - parseInt(timestamp)) / (1000 * 60 * 60 * 24);
    if (daysSinceSave > 7) {
      localStorage.removeItem("visaFormData");
      localStorage.removeItem("visaFormTimestamp");
      return null;
    }
    
    return JSON.parse(data);
  } catch (error) {
    console.error("Failed to load form data:", error);
    return null;
  }
}

// Generate save link
export function generateSaveLink(): string {
  const token = Math.random().toString(36).substring(2, 15);
  localStorage.setItem("visaFormToken", token);
  return `${window.location.origin}/application?token=${token}`;
}

