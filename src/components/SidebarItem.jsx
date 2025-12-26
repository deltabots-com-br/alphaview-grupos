import React from 'react';

const SidebarItem = ({ icon: Icon, label, active, onClick, badge }) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl transition-all duration-200 ${active
                ? 'bg-gradient-to-r from-brand-100 to-accent-100 text-brand-800 font-semibold shadow-sm ring-2 ring-brand-200/50'
                : 'text-slate-600 hover:bg-gradient-to-r hover:from-slate-50 hover:to-brand-50 hover:text-slate-900'
            }`}
    >
        <div className="flex items-center space-x-3">
            <Icon size={19} strokeWidth={active ? 2.5 : 2} />
            <span className="text-sm">{label}</span>
        </div>
        {badge && (
            <span className="bg-gradient-to-r from-red-500 to-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-lg shadow-sm">
                {badge}
            </span>
        )}
    </button>
);

export default SidebarItem;
