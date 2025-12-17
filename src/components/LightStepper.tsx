// Light Stepper Component

interface LightStepperProps {
  currentStep: number;
  totalSteps: number;
  steps: Array<{ id: number; label: string }>;
}

export function LightStepper({ currentStep, totalSteps, steps }: LightStepperProps) {
  return (
    <div className="flex items-center gap-2 py-3 border-b border-slate-200 dark:border-slate-700">
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold transition-all ${
                currentStep === step.id
                  ? "bg-indigo-600 text-white"
                  : currentStep > step.id
                    ? "bg-emerald-500 text-white"
                    : "bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
              }`}
            >
              {currentStep > step.id ? (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                step.id
              )}
            </div>
            <span
              className={`text-sm font-medium hidden sm:inline ${
                currentStep === step.id
                  ? "text-indigo-600 dark:text-indigo-400"
                  : currentStep > step.id
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-slate-500 dark:text-slate-400"
              }`}
            >
              {step.label}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div
              className={`h-px w-8 sm:w-12 transition-all ${
                currentStep > step.id
                  ? "bg-emerald-500"
                  : "bg-slate-200 dark:bg-slate-700"
              }`}
            />
          )}
        </div>
      ))}
      <div className="ml-auto text-xs text-slate-500 dark:text-slate-400">
        Step {currentStep} of {totalSteps}
      </div>
    </div>
  );
}

