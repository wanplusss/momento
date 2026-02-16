import {
    Activity,
    Book,
    Zap,
    Dumbbell,
    Brain,
    Flame,
    Trophy,
    Timer,
    CheckCircle,
    Target
} from 'lucide-react';
import React from 'react';

export const ICONS: Record<string, React.ElementType> = {
    'activity': Activity,
    'book': Book,
    'zap': Zap,
    'dumbbell': Dumbbell,
    'brain': Brain,
    'flame': Flame,
    'trophy': Trophy,
    'timer': Timer,
    'check': CheckCircle,
    'target': Target,
};

export const getIcon = (name: string, props: any = {}) => {
    const Icon = ICONS[name] || Target;
    return <Icon {...props} />;
};
