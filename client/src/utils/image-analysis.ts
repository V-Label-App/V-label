
/**
 * Analyze image quality client-side using Canvas API.
 * checks for:
 * - Resolution (Too small)
 * - Brightness (Too dark / Too bright)
 * - Blur (Laplacian Variance approximation)
 */

export interface ImageQualityResult {
    isGood: boolean;
    issues: string[]; // "Blurry", "Too Dark", "Too Bright", "Low Resolution"
    score: number; // 0-100
    details?: {
        brightness: number;
        blurScore: number;
        resolution: string;
    }
}

export interface ImageQualityConfig {
    minResolution: number;
    minBrightness: number;
    maxBrightness: number;
    blurThreshold: number;
}

// Default Fallback Thresholds
const DEFAULT_THRESHOLDS: ImageQualityConfig = {
    minResolution: 100,
    minBrightness: 25,
    maxBrightness: 245,
    blurThreshold: 25
};

export const analyzeImageQuality = async (file: File, customConfig?: ImageQualityConfig): Promise<ImageQualityResult> => {
    // Merge provided config with defaults
    const config = { ...DEFAULT_THRESHOLDS, ...customConfig };

    return new Promise((resolve) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.src = url;

        img.onload = () => {
            URL.revokeObjectURL(url);

            const issues: string[] = [];
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                resolve({ isGood: true, issues: [], score: 100 });
                return;
            }

            // 1. Check Resolution
            if (img.width < config.minResolution || img.height < config.minResolution) {
                issues.push("Low Resolution");
            }

            // Downscale for performance (max 500px width)
            const width = Math.min(img.width, 500);
            const height = Math.floor(width * (img.height / img.width));
            canvas.width = width;
            canvas.height = height;

            ctx.drawImage(img, 0, 0, width, height);

            try {
                const imageData = ctx.getImageData(0, 0, width, height);
                const data = imageData.data;

                // 2. Check Brightness
                let totalBrightness = 0;
                const grayData = new Uint8ClampedArray(data.length / 4);

                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];
                    // Standard luminance formula
                    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
                    totalBrightness += lum;
                    grayData[i / 4] = lum;
                }

                const avgBrightness = totalBrightness / (data.length / 4);
                if (avgBrightness < config.minBrightness) issues.push("Too Dark");
                if (avgBrightness > config.maxBrightness) issues.push("Too Bright");

                // 3. Check Blur (Laplacian Variance)
                // We use a simple convolution kernel approx
                // Kernel: [0, 1, 0, 1, -4, 1, 0, 1, 0]
                let laplacianSum = 0;
                let laplacianSqSum = 0;
                let count = 0;

                // Iterate ignoring borders
                for (let y = 1; y < height - 1; y++) {
                    for (let x = 1; x < width - 1; x++) {
                        const i = y * width + x;

                        // Apply Laplacian Kernel
                        const current = grayData[i];
                        const top = grayData[i - width];
                        const bottom = grayData[i + width];
                        const left = grayData[i - 1];
                        const right = grayData[i + 1];

                        const lap = Math.abs(top + bottom + left + right - 4 * current);

                        laplacianSum += lap;
                        laplacianSqSum += lap * lap;
                        count++;
                    }
                }

                const meanLap = laplacianSum / count;
                const varianceLap = (laplacianSqSum / count) - (meanLap * meanLap);

                // If variance is low, edges are weak -> blurry
                if (varianceLap < config.blurThreshold) {
                    issues.push("Blurry");
                }

                resolve({
                    isGood: issues.length === 0,
                    issues,
                    score: Math.max(0, 100 - (issues.length * 30)),
                    details: {
                        brightness: Math.round(avgBrightness),
                        blurScore: Math.round(varianceLap),
                        resolution: `${img.width}x${img.height}`
                    }
                });

            } catch (e) {
                console.error("Analysis failed", e);
                resolve({ isGood: true, issues: [], score: 100 });
            }
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            resolve({ isGood: false, issues: ["Corrupt/Invalid"], score: 0 });
        };
    });
};
