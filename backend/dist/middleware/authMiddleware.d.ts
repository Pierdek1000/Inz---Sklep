import { Request, Response, NextFunction } from "express";
export interface AuthPayload {
    id: string;
}
export declare const requireAuth: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
//# sourceMappingURL=authMiddleware.d.ts.map