'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';

interface DualRangeSliderProps {
  min: number;
  max: number;
  values: [number, number];
  onChange: (values: [number, number]) => void;
  onDragEnd?: () => void;
  step?: number;
  formatValue?: (value: number) => string;
  disabled?: boolean;
  className?: string;
}

/**
 * Dual-handle range slider component with proper touch and keyboard support
 */
export function DualRangeSlider({
  min,
  max,
  values,
  onChange,
  onDragEnd,
  step = 1,
  formatValue,
  disabled = false,
  className = '',
}: DualRangeSliderProps) {
  const [localValues, setLocalValues] = useState<[number, number]>(values);
  const [isDragging, setIsDragging] = useState<'min' | 'max' | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const minInputRef = useRef<HTMLInputElement>(null);
  const maxInputRef = useRef<HTMLInputElement>(null);

  // Initialize local values from props only on mount
  // After initialization, local values are controlled entirely by user interaction
  // This prevents the slider from resetting when user moves it
  const hasInitialized = useRef(false);
  
  useEffect(() => {
    if (!hasInitialized.current) {
      setLocalValues(values);
      hasInitialized.current = true;
    }
  }, [values]);

  // Format value for display
  const format = useCallback(
    (value: number) => {
      if (formatValue) return formatValue(value);
      return new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: 'NGN',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    },
    [formatValue]
  );

  // Calculate percentage position
  const getPercentage = useCallback(
    (value: number) => {
      return ((value - min) / (max - min)) * 100;
    },
    [min, max]
  );

  // Clamp value to valid range
  const clamp = useCallback(
    (value: number, minVal: number, maxVal: number) => {
      return Math.max(minVal, Math.min(maxVal, value));
    },
    []
  );

  // Handle min value change
  const handleMinChange = useCallback(
    (newValue: number) => {
      const clamped = clamp(newValue, min, localValues[1] - step);
      const newValues: [number, number] = [clamped, localValues[1]];
      setLocalValues(newValues);
      onChange(newValues);
    },
    [min, localValues, step, clamp, onChange]
  );

  // Handle max value change
  const handleMaxChange = useCallback(
    (newValue: number) => {
      // Ensure max is at least min + step, but can go all the way to max
      // Don't snap - let user set exact position
      const minAllowed = Math.max(localValues[0] + step, min);
      const clamped = clamp(newValue, minAllowed, max);
      
      const newValues: [number, number] = [localValues[0], clamped];
      setLocalValues(newValues);
      onChange(newValues);
    },
    [min, max, localValues, step, clamp, onChange]
  );

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>, type: 'min' | 'max') => {
      if (disabled) return;

      const arrowStep = e.shiftKey ? step * 10 : step;
      let newValue: number;

      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
        e.preventDefault();
        newValue = type === 'min' ? localValues[0] - arrowStep : localValues[1] - arrowStep;
        if (type === 'min') {
          handleMinChange(newValue);
        } else {
          handleMaxChange(newValue);
        }
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
        e.preventDefault();
        newValue = type === 'min' ? localValues[0] + arrowStep : localValues[1] + arrowStep;
        if (type === 'min') {
          handleMinChange(newValue);
        } else {
          handleMaxChange(newValue);
        }
      }
    },
    [disabled, step, localValues, handleMinChange, handleMaxChange]
  );

  // Handle drag start
  const handleDragStart = useCallback((type: 'min' | 'max') => {
    if (disabled) return;
    setIsDragging(type);
  }, [disabled]);

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    setIsDragging(null);
    if (onDragEnd) {
      onDragEnd();
    }
  }, [onDragEnd]);

  const minPercent = getPercentage(localValues[0]);
  const maxPercent = getPercentage(localValues[1]);
  const rangePercent = maxPercent - minPercent;

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Price Display Labels */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex flex-col">
          <label htmlFor="min-price" className="text-xs text-gray-500 mb-1">
            Min Price
          </label>
          <div className="text-sm font-semibold text-gray-900">{format(localValues[0])}</div>
        </div>
        <div className="text-gray-400 mx-2">–</div>
        <div className="flex flex-col items-end">
          <label htmlFor="max-price" className="text-xs text-gray-500 mb-1">
            Max Price
          </label>
          <div className="text-sm font-semibold text-gray-900">{format(localValues[1])}</div>
        </div>
      </div>

      {/* Slider Track */}
      <div className="relative h-3">
        {/* Background track */}
        <div className="absolute inset-0 h-2 bg-gray-200 rounded-full" />

        {/* Active range track */}
        <div
          className="absolute h-2 bg-reach-primary rounded-full transition-all duration-100"
          style={{
            left: `${minPercent}%`,
            width: `${rangePercent}%`,
          }}
        />

        {/* Min handle */}
        <input
          ref={minInputRef}
          id="min-price"
          type="range"
          min={min}
          max={max}
          step={step}
          value={localValues[0]}
          onChange={(e) => handleMinChange(Number(e.target.value))}
          onMouseDown={() => handleDragStart('min')}
          onMouseUp={handleDragEnd}
          onTouchStart={() => handleDragStart('min')}
          onTouchEnd={handleDragEnd}
          onKeyDown={(e) => handleKeyDown(e, 'min')}
          disabled={disabled}
          aria-label={`Minimum price: ${format(localValues[0])}`}
          aria-valuetext={format(localValues[0])}
          className="absolute w-full h-2 bg-transparent appearance-none cursor-pointer z-10 focus:outline-none focus:ring-2 focus:ring-reach-primary/20 focus:ring-offset-2"
          style={{
            WebkitAppearance: 'none',
            appearance: 'none',
          }}
        />

        {/* Max handle */}
        <input
          ref={maxInputRef}
          id="max-price"
          type="range"
          min={min}
          max={max}
          step={step}
          value={localValues[1]}
          onChange={(e) => {
            const rawValue = Number(e.target.value);
            // Use the exact value from the input - no snapping
            handleMaxChange(rawValue);
          }}
          onMouseDown={() => handleDragStart('max')}
          onMouseUp={handleDragEnd}
          onTouchStart={() => handleDragStart('max')}
          onTouchEnd={handleDragEnd}
          onKeyDown={(e) => handleKeyDown(e, 'max')}
          disabled={disabled}
          aria-label={`Maximum price: ${format(localValues[1])}`}
          aria-valuetext={format(localValues[1])}
          className="absolute w-full h-2 bg-transparent appearance-none cursor-pointer z-20 focus:outline-none focus:ring-2 focus:ring-reach-primary/20 focus:ring-offset-2"
          style={{
            WebkitAppearance: 'none',
            appearance: 'none',
          }}
        />
      </div>

      {/* Min/Max labels */}
      <div className="flex justify-between text-xs text-gray-500 mt-2">
        <span>{format(min)}</span>
        <span>{format(max)}</span>
      </div>

      {/* Custom slider thumb styles */}
      <style jsx global>{`
        input[type='range']::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #1E3A5F;
          cursor: ${disabled ? 'not-allowed' : 'grab'};
          border: 3px solid white;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
          transition: transform 0.1s ease;
        }

        input[type='range']::-webkit-slider-thumb:hover {
          transform: scale(1.1);
        }

        input[type='range']::-webkit-slider-thumb:active {
          cursor: ${disabled ? 'not-allowed' : 'grabbing'};
          transform: scale(1.15);
        }

        input[type='range']::-webkit-slider-thumb:focus {
          outline: 2px solid #1E3A5F;
          outline-offset: 2px;
        }

        input[type='range']::-moz-range-thumb {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #1E3A5F;
          cursor: ${disabled ? 'not-allowed' : 'grab'};
          border: 3px solid white;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
          -moz-appearance: none;
          appearance: none;
          transition: transform 0.1s ease;
        }

        input[type='range']::-moz-range-thumb:hover {
          transform: scale(1.1);
        }

        input[type='range']::-moz-range-thumb:active {
          cursor: ${disabled ? 'not-allowed' : 'grabbing'};
          transform: scale(1.15);
        }

        input[type='range']::-moz-range-thumb:focus {
          outline: 2px solid #1E3A5F;
          outline-offset: 2px;
        }

        input[type='range']::-webkit-slider-runnable-track {
          height: 8px;
          background: transparent;
        }

        input[type='range']::-moz-range-track {
          height: 8px;
          background: transparent;
          border: none;
        }

        input[type='range']:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
