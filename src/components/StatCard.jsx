import React from 'react';

const StatCard = ({ icon: Icon, label, value, subtext, trend }) => {
    return (
        <div className="stat-card-unique bg-white rounded-lg md:rounded-xl p-2.5 md:p-5 shadow-sm border border-slate-200 hover:shadow-md transition-all">
            <div className="flex items-start justify-between gap-1.5">
                <div className="flex-1 min-w-0">
                    <p className="text-[8px] md:text-xs font-semibold text-slate-500 uppercase tracking-wide mb-0.5 leading-tight">
                        {label}
                    </p>
                    <h3 className="text-base md:text-2xl font-bold text-slate-900 mb-0 leading-none">
                        {value}
                    </h3>
                    {subtext && (
                        <p className="text-[8px] md:text-xs text-slate-500 leading-tight mt-0.5">
                            {subtext}
                        </p>
                    )}
                    {trend && (
                        <p className={`text-[8px] md:text-xs font-medium mt-0.5 leading-tight ${trend.startsWith('+') ? 'text-emerald-600' : 'text-slate-500'
                            }`}>
                            {trend}
                        </p>
                    )}
                </div>

                {/* Icon - Alphaview Style */}
                <div className="flex-shrink-0">
                    <div className="w-8 h-8 md:w-12 md:h-12 rounded-lg bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center shadow-sm">
                        <Icon className="text-white" size={14} strokeWidth={2.5} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StatCard;
