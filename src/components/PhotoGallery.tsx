import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Photo {
  url: string;
  width: number;
  height: number;
}

interface PhotoGalleryProps {
  photos: Photo[];
  placeName: string;
}

export const PhotoGallery = ({ photos, placeName }: PhotoGalleryProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!photos || photos.length === 0) return null;

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % photos.length);
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  // 🔥 Preload next & previous images for instant switching
  useEffect(() => {
    if (!photos || photos.length === 0) return;

    const preload = (index: number) => {
      const url = photos[index]?.url;
      if (!url) return;
      const img = new Image();
      img.src = url;
    };

    const nextIndex = (currentIndex + 1) % photos.length;
    const prevIndex = (currentIndex - 1 + photos.length) % photos.length;

    preload(nextIndex);
    preload(prevIndex);
  }, [currentIndex, photos]); // runs whenever you change photo

  return (
    <div className="relative w-full h-48 rounded-lg overflow-hidden bg-muted">
      <img
        src={photos[currentIndex].url}
        alt={`${placeName} - Photo ${currentIndex + 1}`}
        className="w-full h-full object-cover transition-opacity duration-200"
      />

      {photos.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background/90"
            onClick={goToPrevious}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background/90"
            onClick={goToNext}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {photos.map((_, idx) => (
              <button
                key={idx}
                className={`w-2 h-2 rounded-full transition-colors ${
                  idx === currentIndex ? "bg-primary" : "bg-background/60"
                }`}
                onClick={() => setCurrentIndex(idx)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};
