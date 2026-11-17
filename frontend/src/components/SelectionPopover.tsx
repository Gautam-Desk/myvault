import React from 'react';
import { FilePlus, Layers3 } from 'lucide-react';
import { useLibraryStore } from '../store/useLibraryStore';
import { HighlightColor } from '../types';

interface SelectionPopoverProps {
  position: { x: number; y: number };
  selectedText: string;
  onClose: () => void;
}

export const SelectionPopover: React.FC<SelectionPopoverProps> = ({
  position,
  selectedText,
  onClose,
}) => {
  const {
    activeBook,
    currentNotes,
    addHighlight,
    updateNotes,
    setActiveToolTab,
  } = useLibraryStore();

  const handleApplyColor = (color: HighlightColor) => {
    addHighlight(selectedText, color);
    window.getSelection()?.removeAllRanges();
    onClose();
  };

  const handleSendToNotes = () => {
    const pageNum = activeBook ? activeBook.current_page : 1;
    const addition = `\n> "${selectedText}" — **[Page ${pageNum}]**\n`;
    updateNotes(currentNotes + addition, pageNum);
    setActiveToolTab('notes');
    window.getSelection()?.removeAllRanges();
    onClose();
  };

  const handleSendToFlashcard = () => {
    setActiveToolTab('flashcards');
    window.getSelection()?.removeAllRanges();
    onClose();
  };

  return (
    <div
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
      className="fixed z-50 bg-[#22150E] text-[#F7EFE6] rounded-xl shadow-2xl border border-[#4F3424] px-2 py-1 flex items-center gap-1.5 text-[11px] select-none"
    >
      <div className="flex items-center gap-1 pr-1.5 border-r border-[#3B2519]">
        <span className="text-[10px] text-[#A88E79] font-semibold px-0.5">Ink:</span>
        <button
          onClick={() => handleApplyColor('amber')}
          title="Amber Gold"
          className="w-3.5 h-3.5 rounded-full bg-[#E09453] hover:scale-125 transition-transform"
        />
        <button
          onClick={() => handleApplyColor('terracotta')}
          title="Terracotta Rose"
          className="w-3.5 h-3.5 rounded-full bg-[#C45B47] hover:scale-125 transition-transform"
        />
        <button
          onClick={() => handleApplyColor('sage')}
          title="Sage Olive"
          className="w-3.5 h-3.5 rounded-full bg-[#6B8654] hover:scale-125 transition-transform"
        />
        <button
          onClick={() => handleApplyColor('slate')}
          title="Sky Slate"
          className="w-3.5 h-3.5 rounded-full bg-[#5B7C94] hover:scale-125 transition-transform"
        />
      </div>

      <button
        onClick={handleSendToNotes}
        className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-[#3B2519] text-[#E09453] font-semibold transition-colors"
      >
        <FilePlus className="w-3 h-3" />
        <span>+ Note</span>
      </button>

      <button
        onClick={handleSendToFlashcard}
        className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-[#3B2519] text-[#F7EFE6] font-semibold transition-colors"
      >
        <Layers3 className="w-3 h-3" />
        <span>+ Flashcard</span>
      </button>
    </div>
  );
};
