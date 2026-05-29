import React, { useEffect, useRef, useState } from 'react';
import { FiEye, FiEyeOff } from 'react-icons/fi';

const getSelectionBounds = (input) => ({
  start: input.selectionStart ?? 0,
  end: input.selectionEnd ?? 0,
});

const replaceRange = (value, start, end, nextText) => `${value.slice(0, start)}${nextText}${value.slice(end)}`;

const MaskedPasswordInput = ({
  value,
  onChange,
  className = '',
  placeholder = '',
  required = false,
  autoComplete = 'off',
  name,
  id,
  nativePassword = false,
}) => {
  const inputRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const maskedValue = '*'.repeat(value.length);

  useEffect(() => {
    const input = inputRef.current;
    if (!input || isVisible) return;

    const nextPosition = maskedValue.length;
    input.setSelectionRange(nextPosition, nextPosition);
  }, [maskedValue, isVisible]);

  const handleKeyDown = (event) => {
    const input = inputRef.current;
    if (!input) return;

    const { key, ctrlKey, metaKey } = event;
    if (ctrlKey || metaKey) return;

    const { start, end } = getSelectionBounds(input);

    if (key === 'Backspace') {
      event.preventDefault();
      if (start !== end) {
        onChange(replaceRange(value, start, end, ''));
        return;
      }
      if (start > 0) {
        onChange(replaceRange(value, start - 1, end, ''));
      }
      return;
    }

    if (key === 'Delete') {
      event.preventDefault();
      if (start !== end) {
        onChange(replaceRange(value, start, end, ''));
        return;
      }
      onChange(replaceRange(value, start, start + 1, ''));
      return;
    }

    if (key.length === 1) {
      event.preventDefault();
      onChange(replaceRange(value, start, end, key));
    }
  };

  const handlePaste = (event) => {
    event.preventDefault();
    const pastedText = event.clipboardData.getData('text');
    const input = inputRef.current;
    if (!input) return;
    const { start, end } = getSelectionBounds(input);
    onChange(replaceRange(value, start, end, pastedText));
  };

  if (nativePassword) {
    return (
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          name={name}
          type={isVisible ? 'text' : 'password'}
          autoComplete={autoComplete}
          spellCheck="false"
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={className}
          required={required}
        />
        <button
          type="button"
          onClick={() => setIsVisible((prev) => !prev)}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors duration-200 hover:text-slate-600"
          aria-label={isVisible ? 'Hide password' : 'Show password'}
        >
          {isVisible ? <FiEyeOff /> : <FiEye />}
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        id={id}
        name={name}
        type="text"
        inputMode="text"
        autoComplete={autoComplete}
        spellCheck="false"
        placeholder={placeholder}
        value={isVisible ? value : maskedValue}
        onKeyDown={isVisible ? undefined : handleKeyDown}
        onPaste={isVisible ? undefined : handlePaste}
        onChange={isVisible ? (event) => onChange(event.target.value) : () => {}}
        className={className}
        required={required}
      />
      <button
        type="button"
        onClick={() => setIsVisible((prev) => !prev)}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors duration-200 hover:text-slate-600"
        aria-label={isVisible ? 'Hide password' : 'Show password'}
      >
        {isVisible ? <FiEyeOff /> : <FiEye />}
      </button>
    </div>
  );
};

export default MaskedPasswordInput;
