import React from 'react';
import { useNavigate } from 'react-router-dom';

const Intro: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-8 animate-fade-in font-heebo">
      {/* Avatar Image Section */}
      <div className="relative mb-2">
        <div className="w-32 h-32 rounded-full p-1 bg-gradient-to-tr from-purple-400 to-purple-600 shadow-xl shadow-purple-200">
           {/* PLEASE PLACE YOUR IMAGE AS 'avatar.png' IN THE PUBLIC FOLDER */}
           <img 
             src="/avatar.png" 
             alt="Your Business Guide" 
             className="w-full h-full rounded-full object-cover border-4 border-white bg-slate-100"
             onError={(e) => {
               (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=Or+Guide&background=9333ea&color=fff&size=256'; // Fallback
             }}
           />
        </div>
        <div className="absolute -bottom-2 -right-2 bg-green-400 w-6 h-6 rounded-full border-4 border-white shadow-sm"></div>
      </div>

      <div className="space-y-4">
        <h1 className="text-4xl font-extrabold text-slate-900 leading-tight">
          בדיקת בריאות תפעולית
          <span className="block text-purple-600 text-2xl mt-2 font-normal">Business Scalability Audit</span>
        </h1>
        <p className="text-lg text-slate-600 max-w-md mx-auto leading-relaxed">
          גלי מה עוצר את העסק שלך מלגדול, וקבלי מפת דרכים ברורה למעבר מעסק של "לוחמת בודדה" למערכת צומחת.
        </p>
      </div>

      <div className="bg-purple-50 p-6 rounded-2xl w-full max-w-sm border border-purple-100">
        <ul className="text-right space-y-3 text-sm text-slate-700">
          <li className="flex items-center gap-2">
            <span className="text-purple-500 font-bold">✓</span> אבחון מהיר (2 דקות)
          </li>
          <li className="flex items-center gap-2">
            <span className="text-purple-500 font-bold">✓</span> מותאם אישית למצבך
          </li>
          <li className="flex items-center gap-2">
            <span className="text-purple-500 font-bold">✓</span> דוח מקצועי בסיום
          </li>
        </ul>
      </div>

      <button
        onClick={() => navigate('/diagnostic')}
        className="bg-purple-600 text-white text-xl font-bold py-4 px-12 rounded-full shadow-lg shadow-purple-200 hover:bg-purple-700 hover:shadow-xl transition-all active:scale-95 w-full max-w-xs"
      >
        התחילי עכשיו
      </button>
      
      <p className="text-xs text-gray-400 mt-8">גרסה 3.0 | MVP Demo</p>
    </div>
  );
};

export default Intro;