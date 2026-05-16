// Shared "loose" types for legacy data shapes that flow between localStorage,
// server actions, and engine services. These are intentionally lenient
// (string-indexed) because the same objects gained fields across versions and
// retrofitting a strict schema everywhere is out of scope for this pass.

export type AnimalLike = {
    id?: string;
    crotal?: string;
    farmId?: string;
    farm?: string;
    sex?: string;
    breed?: string;
    birth?: string;
    birthDate?: string | Date;
    birthWeight?: number;
    currentWeight?: number;
    weight?: number | string;
    status?: string;
    healthStatus?: string;
    category?: string;
    corral?: string | number;
    notes?: string;
    father?: string;
    mother?: string;
    motherId?: string;
    fatherId?: string;
    exitDate?: string;
    deathReason?: string;
    actualPrice?: number;
    actualPricePerKg?: number;
    actualLiveWeight?: number;
    actualCarcassWeight?: number;
    actualCategory?: string;
    actualYield?: number;
    actualSeuropConf?: string;
    actualSeuropFat?: string;
    castrationDate?: string;
    isBreeder?: boolean;
    h_w?: number[];
    h_end?: string;
    monthlyRecords?: Array<{
        date: string;
        weightKg: number;
        adg?: number;
        rc_est?: number;
        carcass_weight_est?: number;
        meat_quality_index?: number;
        marbling_est?: number;
        diet_energy?: number;
        thi?: number;
    }>;
    createdAt?: string;
    updatedAt?: string;
    [key: string]: unknown;
};

export type LivestockEvent = {
    id?: string;
    type: string;
    date: string;
    animalId?: string | null;
    animalCrotal?: string;
    desc?: string;
    notes?: string;
    cost?: number;
    weight?: number;
    status?: 'scheduled' | 'pending' | 'completed' | string;
    completed?: boolean;
    nextDate?: string;
    actionRequired?: string;
    createdAt?: string;
    [key: string]: unknown;
};

export type FarmLike = {
    id?: string;
    name?: string;
    municipio?: string;
    coords?: { lat?: number; lng?: number; lon?: number } | null;
    [key: string]: unknown;
};
