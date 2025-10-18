declare module "bcryptjs" {
  export function hash(data: string, saltOrRounds?: number | string): Promise<string>;
  export function compare(data: string, encrypted: string): Promise<boolean>;
  export function hashSync(data: string, saltOrRounds?: number | string): string;
  export function compareSync(data: string, encrypted: string): boolean;
}

declare module "jsqr" {
  interface QRCode {
    data: string;
    location: {
      topLeftCorner: { x: number; y: number };
      topRightCorner: { x: number; y: number };
      bottomLeftCorner: { x: number; y: number };
      bottomRightCorner: { x: number; y: number };
    };
  }
  
  function jsQR(
    imageData: Uint8ClampedArray,
    width: number,
    height: number,
    options?: {
      inversionAttempts?: "dontInvert" | "attemptBoth" | "invertFirst";
    }
  ): QRCode | null;
  
  export = jsQR;
}


