import React, { useState, useMemo, useEffect, useRef } from 'react';
import { prepareChartData } from '../utils/calculations.js';
import { parseDDMMYYYY } from '../utils/dateUtils.js';
import {
  ResponsiveContainer,
  LineChart as RechartsLine,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceDot,
  Brush
} from 'recharts';
import {
  LineChart,
  BarChart2,
  TrendingDown,
  TrendingUp,
  Sparkles,
  ZoomIn,
  ZoomOut,
  Sliders,
  CircleDollarSign,
  Maximize2
} from 'lucide-react';

export default function SchemeCharts({ navDataList = [], schemeName = 'Mutual Fund', avgBuyNAV = null, transactions = [] }) {
  const [chartType, setChartType] = useState('area');
  const [timeRange, setTimeRange] = useState('1Y');
  const [hoveredData, setHoveredData] = useState(null);
  
  const [showSMA20, setShowSMA20] = useState(true);
  const [showSMA50, setShowSMA50] = useState(false);
  const [showPurchaseDots, setShowPurchaseDots] = useState(true);

  // Zoom factor state
  const [zoomFactor, setZoomFactor] = useState(1.0);
  const [showBrush, setShowBrush] = useState(true); // Default to TRUE for big bottom slider!

  const chartContainerRef = useRef(null);

  useEffect(() => {
    setZoomFactor(1.0);
  }, [timeRange]);

  // Touch Pinch-to-Zoom (pinch in -> zoom out, pinch out -> zoom in) & Mouse Wheel Zoom
  useEffect(() => {
    const elem = chartContainerRef.current;
    if (!elem) return;

    let initialPinchDist = 0;

    const handleWheel = (e) => {
      // Prevent default page scroll when scrolling inside chart
      e.preventDefault();
      if (e.deltaY < 0) {
        // Scroll up -> Zoom in
        setZoomFactor(prev => Math.min(prev * 1.15, 10.0));
      } else {
        // Scroll down -> Zoom out
        setZoomFactor(prev => Math.max(prev / 1.15, 1.0));
      }
    };

    const handleTouchStart = (e) => {
      if (e.touches.length === 2) {
        initialPinchDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
      }
    };

    const handleTouchMove = (e) => {
      if (e.touches.length === 2 && initialPinchDist > 0) {
        e.preventDefault(); // Prevent native browser pinch-zoom
        const currentDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const scale = currentDist / initialPinchDist;

        if (scale > 1.03) {
          // Pinch Out (expanding fingers) -> Zoom In
          setZoomFactor(prev => Math.min(prev * 1.06, 10.0));
          initialPinchDist = currentDist;
        } else if (scale < 0.97) {
          // Pinch In (pinching fingers together) -> Zoom Out
          setZoomFactor(prev => Math.max(prev / 1.06, 1.0));
          initialPinchDist = currentDist;
        }
      }
    };

    const handleTouchEnd = () => {
      initialPinchDist = 0;
    };

    elem.addEventListener('wheel', handleWheel, { passive: false });
    elem.addEventListener('touchstart', handleTouchStart, { passive: true });
    elem.addEventListener('touchmove', handleTouchMove, { passive: false });
    elem.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      elem.removeEventListener('wheel', handleWheel);
      elem.removeEventListener('touchstart', handleTouchStart);
      elem.removeEventListener('touchmove', handleTouchMove);
      elem.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  // Chronological chart dataset
  const fullChartData = useMemo(() => {
    return prepareChartData(navDataList);
  }, [navDataList]);

  // Filter dataset by timeframe
  const filteredData = useMemo(() => {
    if (fullChartData.length === 0) return [];
    if (timeRange === 'ALL') return fullChartData;

    const lastItem = fullChartData[fullChartData.length - 1];
    const lastDate = parseDDMMYYYY(lastItem.date) || new Date();
    const cutoff = new Date(lastDate);

    switch (timeRange) {
      case '1M': cutoff.setMonth(cutoff.getMonth() - 1); break;
      case '3M': cutoff.setMonth(cutoff.getMonth() - 3); break;
      case '6M': cutoff.setMonth(cutoff.getMonth() - 6); break;
      case '1Y': cutoff.setFullYear(cutoff.getFullYear() - 1); break;
      case '3Y': cutoff.setFullYear(cutoff.getFullYear() - 3); break;
      default: break;
    }

    return fullChartData.filter(d => {
      const itemDate = parseDDMMYYYY(d.date);
      return itemDate && itemDate >= cutoff;
    });
  }, [fullChartData, timeRange]);

  // Sliced data based on zoomFactor
  const displayData = useMemo(() => {
    if (filteredData.length === 0) return [];
    if (zoomFactor <= 1.0) return filteredData;

    const visibleCount = Math.max(10, Math.floor(filteredData.length / zoomFactor));
    return filteredData.slice(filteredData.length - visibleCount);
  }, [filteredData, zoomFactor]);

  // Find exact purchase NAV dots for displayData
  const purchaseDots = useMemo(() => {
    if (!showPurchaseDots || !transactions || transactions.length === 0 || displayData.length === 0) {
      return [];
    }

    const dots = [];
    const dateMap = new Map();
    displayData.forEach(item => dateMap.set(item.date, item));

    transactions.forEach(tx => {
      const dateStr = tx.date;
      if (dateMap.has(dateStr)) {
        const item = dateMap.get(dateStr);
        dots.push({
          date: dateStr,
          nav: item.nav,
          purchaseNav: parseFloat(tx.nav),
          type: tx.type,
          amount: tx.amount,
          units: tx.units,
          notes: tx.notes
        });
      }
    });

    return dots;
  }, [displayData, transactions, showPurchaseDots]);

  // Current active data point
  const currentPoint = hoveredData || (displayData.length > 0 ? displayData[displayData.length - 1] : null);
  const startPoint = displayData.length > 0 ? displayData[0] : null;

  // Period return calculation
  const periodReturnPct = useMemo(() => {
    if (!currentPoint || !startPoint || startPoint.nav === 0) return 0;
    return ((currentPoint.nav - startPoint.nav) / startPoint.nav) * 100;
  }, [currentPoint, startPoint]);

  // Y domain bounds
  const yDomain = useMemo(() => {
    if (displayData.length === 0) return ['auto', 'auto'];
    const navs = displayData.map(d => d.nav);
    if (avgBuyNAV) navs.push(avgBuyNAV);
    purchaseDots.forEach(p => navs.push(p.purchaseNav));

    const min = Math.min(...navs);
    const max = Math.max(...navs);
    const padding = (max - min) * 0.08 || 2;
    return [Math.max(0, Math.floor(min - padding)), Math.ceil(max + padding)];
  }, [displayData, avgBuyNAV, purchaseDots]);

  return (
    <div className="mobile-card-glass rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl space-y-4">
      
      {/* Mobile Price & Purchase Info Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-2 border-b border-slate-800/80">
        <div>
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex flex-wrap items-center gap-1.5">
            <span>NAV Price</span>
            {currentPoint && <span className="text-slate-500">• {currentPoint.date}</span>}
            {avgBuyNAV && (
              <span className="text-[10px] px-2 py-0.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded-md font-mono font-bold">
                Avg Buy: ₹{avgBuyNAV.toFixed(2)}
              </span>
            )}
          </div>
          
          <div className="flex items-baseline gap-3 mt-1">
            <div className="text-3xl sm:text-4xl font-black font-mono text-white tracking-tight">
              {currentPoint ? `₹${currentPoint.nav.toFixed(2)}` : '₹0.00'}
            </div>

            <div className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-extrabold font-mono border ${
              periodReturnPct >= 0
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
            }`}>
              {periodReturnPct >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              <span>{periodReturnPct >= 0 ? '+' : ''}{periodReturnPct.toFixed(2)}%</span>
            </div>
          </div>
        </div>

        {/* Mobile Touch & Slider Zoom Controls */}
        <div className="flex items-center justify-between sm:justify-end gap-2 pt-1 sm:pt-0">
          
          {/* Gesture Hint Badge */}
          <span className="text-[10px] text-emerald-400/80 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg font-medium hidden lg:inline">
            💡 Pinch / Scroll to Zoom
          </span>

          {/* Quick Zoom Presets Bar */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-2xl border border-slate-800">
            <span className="text-[10px] text-slate-500 font-bold px-1 hidden sm:inline">ZOOM</span>
            
            <button
              onClick={() => setZoomFactor(1.0)}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold font-mono transition-all active-press ${
                zoomFactor === 1.0 ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              1x
            </button>

            <button
              onClick={() => setZoomFactor(2.0)}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold font-mono transition-all active-press ${
                zoomFactor === 2.0 ? 'bg-emerald-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              2x
            </button>

            <button
              onClick={() => setZoomFactor(4.0)}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold font-mono transition-all active-press ${
                zoomFactor === 4.0 ? 'bg-emerald-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              4x
            </button>

            <button
              onClick={() => setZoomFactor(prev => Math.min(prev * 1.5, 10.0))}
              title="Zoom In (Pinch Out)"
              className="p-1 rounded-lg bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-slate-300 active-press"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setZoomFactor(prev => Math.max(prev / 1.5, 1.0))}
              disabled={zoomFactor <= 1.0}
              title="Zoom Out (Pinch In)"
              className="p-1 rounded-lg bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-slate-300 disabled:opacity-30 active-press"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Toggle Big Slider */}
          <button
            onClick={() => setShowBrush(!showBrush)}
            title="Toggle Big Bottom Slider"
            className={`px-2.5 py-1 rounded-xl text-[10px] font-bold font-mono border transition-all active-press flex items-center gap-1 ${
              showBrush
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-slate-900 text-slate-500 border-slate-800'
            }`}
          >
            <Sliders className="w-3 h-3 text-emerald-400" />
            <span className="hidden sm:inline">Slider</span>
          </button>

          {/* Toggle Purchase Dots */}
          {transactions.length > 0 && (
            <button
              onClick={() => setShowPurchaseDots(!showPurchaseDots)}
              title="Toggle Purchase Dots on Chart"
              className={`px-2 py-1 rounded-xl text-[10px] font-bold font-mono border transition-all active-press flex items-center gap-1 ${
                showPurchaseDots
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-slate-900 text-slate-500 border-slate-800'
              }`}
            >
              <CircleDollarSign className="w-3 h-3 text-emerald-400" />
              <span>{purchaseDots.length} Buys</span>
            </button>
          )}

        </div>
      </div>

      {/* Time Horizon Segmented Bar */}
      <div className="flex items-center justify-between gap-1 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800/80 overflow-x-auto scrollbar-none">
        {['1M', '3M', '6M', '1Y', '3Y', 'ALL'].map(range => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-extrabold transition-all active-press ${
              timeRange === range
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {range}
          </button>
        ))}
      </div>

      {/* Interactive Touch Chart Canvas */}
      <div ref={chartContainerRef} className="h-72 sm:h-96 w-full pt-1 touch-none">
        {displayData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-500 text-xs">
            Loading chart data...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'area' && (
              <AreaChart
                data={displayData}
                onMouseMove={(e) => e && e.activePayload && setHoveredData(e.activePayload[0]?.payload)}
                onMouseLeave={() => setHoveredData(null)}
              >
                <defs>
                  <linearGradient id="mobileAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={periodReturnPct >= 0 ? '#10b981' : '#f43f5e'} stopOpacity={0.45}/>
                    <stop offset="100%" stopColor={periodReturnPct >= 0 ? '#10b981' : '#f43f5e'} stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 2" stroke="#334155" opacity={0.3} />
                <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 9 }} minTickGap={30} />
                <YAxis domain={yDomain} stroke="#64748b" tick={{ fontSize: 9 }} hide={window.innerWidth < 640} tickFormatter={(v) => `₹${v}`} />
                <Tooltip cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '4 4' }} content={<></>} />
                <Area
                  type="monotone"
                  dataKey="nav"
                  stroke={periodReturnPct >= 0 ? '#10b981' : '#f43f5e'}
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#mobileAreaGrad)"
                />
                
                {/* Average Purchase NAV Reference Line */}
                {avgBuyNAV && (
                  <ReferenceLine
                    y={avgBuyNAV}
                    stroke="#06b6d4"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    label={{
                      value: `Avg Buy: ₹${avgBuyNAV.toFixed(2)}`,
                      fill: '#06b6d4',
                      fontSize: 10,
                      position: 'top',
                      fontWeight: 'bold'
                    }}
                  />
                )}

                {/* Individual Purchase Dots on Chart */}
                {purchaseDots.map((dot, idx) => (
                  <ReferenceDot
                    key={idx}
                    x={dot.date}
                    y={dot.purchaseNav}
                    r={6}
                    fill="#10b981"
                    stroke="#ffffff"
                    strokeWidth={2}
                    label={{
                      value: `Buy ₹${Math.round(dot.purchaseNav)}`,
                      fill: '#34d399',
                      fontSize: 9,
                      position: 'top',
                      fontWeight: 'bold'
                    }}
                  />
                ))}

                {showSMA20 && <Line type="monotone" dataKey="sma20" stroke="#06b6d4" strokeWidth={1.5} dot={false} strokeDasharray="3 3" />}
                
                {/* Big Bottom Slider Brush */}
                {showBrush && (
                  <Brush
                    dataKey="date"
                    height={38}
                    stroke="#10b981"
                    fill="#0f172a"
                    travellerWidth={14}
                    gap={1}
                  />
                )}
              </AreaChart>
            )}

            {chartType === 'line' && (
              <RechartsLine
                data={displayData}
                onMouseMove={(e) => e && e.activePayload && setHoveredData(e.activePayload[0]?.payload)}
                onMouseLeave={() => setHoveredData(null)}
              >
                <CartesianGrid strokeDasharray="2 2" stroke="#334155" opacity={0.3} />
                <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 9 }} minTickGap={30} />
                <YAxis domain={yDomain} stroke="#64748b" tick={{ fontSize: 9 }} hide={window.innerWidth < 640} tickFormatter={(v) => `₹${v}`} />
                <Tooltip cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '4 4' }} content={<></>} />
                <Line type="monotone" dataKey="nav" stroke="#10b981" strokeWidth={2.5} dot={false} />
                
                {avgBuyNAV && (
                  <ReferenceLine y={avgBuyNAV} stroke="#06b6d4" strokeWidth={1.5} strokeDasharray="4 4" />
                )}

                {purchaseDots.map((dot, idx) => (
                  <ReferenceDot key={idx} x={dot.date} y={dot.purchaseNav} r={6} fill="#10b981" stroke="#ffffff" strokeWidth={2} />
                ))}

                {showSMA20 && <Line type="monotone" dataKey="sma20" stroke="#06b6d4" strokeWidth={1.5} dot={false} strokeDasharray="3 3" />}
                {showSMA50 && <Line type="monotone" dataKey="sma50" stroke="#f59e0b" strokeWidth={1.5} dot={false} strokeDasharray="3 3" />}
                
                {/* Big Bottom Slider Brush */}
                {showBrush && (
                  <Brush
                    dataKey="date"
                    height={38}
                    stroke="#10b981"
                    fill="#0f172a"
                    travellerWidth={14}
                    gap={1}
                  />
                )}
              </RechartsLine>
            )}

            {chartType === 'bar' && (
              <BarChart data={displayData.slice(-60)}>
                <CartesianGrid strokeDasharray="2 2" stroke="#334155" opacity={0.3} />
                <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 9 }} minTickGap={20} />
                <YAxis domain={yDomain} stroke="#64748b" tick={{ fontSize: 9 }} hide={window.innerWidth < 640} />
                <Bar dataKey="nav" fill="#06b6d4" radius={[3, 3, 0, 0]} />
                
                {/* Big Bottom Slider Brush */}
                {showBrush && (
                  <Brush
                    dataKey="date"
                    height={38}
                    stroke="#06b6d4"
                    fill="#0f172a"
                    travellerWidth={14}
                    gap={1}
                  />
                )}
              </BarChart>
            )}

            {chartType === 'drawdown' && (
              <AreaChart data={displayData}>
                <defs>
                  <linearGradient id="dipAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.5}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.05}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 2" stroke="#334155" opacity={0.3} />
                <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 9 }} minTickGap={30} />
                <YAxis stroke="#64748b" tick={{ fontSize: 9 }} tickFormatter={(v) => `${v}%`} />
                <Area type="monotone" dataKey="drawdownPct" stroke="#f43f5e" strokeWidth={2} fill="url(#dipAreaGrad)" />
                <ReferenceLine y={-5} stroke="#f59e0b" strokeDasharray="3 3" />
                <ReferenceLine y={-10} stroke="#f43f5e" strokeDasharray="3 3" />
                
                {/* Big Bottom Slider Brush */}
                {showBrush && (
                  <Brush
                    dataKey="date"
                    height={38}
                    stroke="#f43f5e"
                    fill="#0f172a"
                    travellerWidth={14}
                    gap={1}
                  />
                )}
              </AreaChart>
            )}
          </ResponsiveContainer>
        )}
      </div>

      {/* Bottom Chart Mode Controls */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl">
          {[
            { id: 'area', icon: Sparkles, label: 'Area' },
            { id: 'line', icon: LineChart, label: 'Line' },
            { id: 'bar', icon: BarChart2, label: 'Bar' },
            { id: 'drawdown', icon: TrendingDown, label: 'Dip %' }
          ].map(type => {
            const Icon = type.icon;
            return (
              <button
                key={type.id}
                onClick={() => setChartType(type.id)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all active-press ${
                  chartType === type.id
                    ? type.id === 'drawdown'
                      ? 'bg-rose-500 text-white shadow-sm'
                      : 'bg-slate-700 text-emerald-400 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{type.label}</span>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => setShowSMA20(!showSMA20)}
          className={`px-2.5 py-1 text-xs rounded-xl border transition-all font-semibold active-press ${
            showSMA20
              ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
              : 'bg-slate-900 text-slate-500 border-slate-800'
          }`}
        >
          20 SMA
        </button>
      </div>

    </div>
  );
}
