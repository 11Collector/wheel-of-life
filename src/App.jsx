import emailjs from '@emailjs/browser';
import { db, collection, addDoc, serverTimestamp, getDocs, query, orderBy } from './firebase';
import { useState, useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  defaults 
} from 'chart.js';
import { Radar } from 'react-chartjs-2';
import './App.css';

// --- 1. ตั้งค่า Global Chart.js ---
defaults.font.family = 'Kanit'; 
defaults.color = '#4A0000';

const whiteBackgroundPlugin = {
  id: 'whiteBackground',
  beforeDraw: (chart) => {
    const ctx = chart.canvas.getContext('2d');
    ctx.save();
    ctx.globalCompositeOperation = 'destination-over';
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, chart.width, chart.height);
    ctx.restore();
  }
};

// ✅ Component สำหรับ Footer (วางไว้นอก App)
const Footer = () => (
  <div style={{ 
    textAlign: 'center', 
    padding: '20px 0', 
    color: '#800000', 
    fontSize: '12px', 
    opacity: 0.7, 
    fontWeight: '300', 
    letterSpacing: '0.5px',
    marginTop: 'auto' // ดันลงล่างสุดถ้าอยู่ใน flex container
  }}>
    Created by <strong>อัพสกิลกับฟุ้ย</strong>
  </div>
);

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend, whiteBackgroundPlugin);

// ✅ ปรับสีให้เข้มขึ้น (High Contrast) สวยและอ่านง่าย
const categoriesData = [
  { label: '❤️ สุขภาพ (Health)', chartLabel: ['❤️ สุขภาพ', '(Health)'], color: '#D32F2F', popupTitle: '🤔 ฉันดูแลสุขภาพตัวเองดีแค่ไหน?', popupText: ['✅ ฉันมีพฤติกรรมการกินที่ดีต่อสุขภาพไหม?', '✅ ฉันออกกำลังกายสม่ำเสมอหรือเปล่า?', '✅ ฉันนอนหลับเพียงพอและมีพลังงานในแต่ละวันไหม?', '✅ ฉันมีปัญหาสุขภาพที่ควรแก้ไขหรือไม่?'], popupHint: '➡ ให้คะแนน 0-10 ตามสุขภาพของคุณในปัจจุบัน' },
  { label: '💎 การเงิน (Salary / Financial)', chartLabel: ['💎 การเงิน', '(Salary/Financial)'], color: '#E65100', popupTitle: '🤔 ฉันบริหารเงินของตัวเองดีแค่ไหน?', popupText: ['✅ ฉันมีเงินออมและการลงทุนที่มั่นคงไหม?', '✅ ฉันสามารถรับมือกับค่าใช้จ่ายที่ไม่คาดคิดได้หรือไม่?', '✅ ฉันมีรายรับที่เพียงพอต่อการใช้ชีวิตที่ต้องการหรือเปล่า?', '✅ ฉันมีหนี้สินที่ควบคุมได้หรือไม่?'], popupHint: '➡ ให้คะแนน 0-10 ตามสถานะทางการเงินของคุณ' },
  { label: '💼 การงานหรือธุรกิจ (Work / Business)', chartLabel: ['💼 การงาน/ธุรกิจ', '(Work/Business)'], color: '#00695C', popupTitle: '🤔 ฉันพอใจกับงานของตัวเองแค่ไหน?', popupText: ['✅ งานของฉันสอดคล้องกับเป้าหมายชีวิตของฉันไหม?', '✅ ฉันมีโอกาสเติบโตและพัฒนาทักษะในงานของฉันหรือไม่?', '✅ ฉันรู้สึกว่างานของฉันมีความหมายและสร้างคุณค่าไหม?', '✅ ฉันมีความสมดุลระหว่างชีวิตกับการทำงานหรือเปล่า?'], popupHint: '➡ ให้คะแนน 0-10 ตามความพึงพอใจในงานของคุณ' },
  { label: '👨‍👩‍👧‍👦 ครอบครัว (Family)', chartLabel: ['👨‍👩‍👧‍👦 ครอบครัว', '(Family)'], color: '#AD1457', popupTitle: '🤔 ฉันมีความสัมพันธ์ที่ดีและเติมเต็มกับครอบครัวไหม?', popupText: ['✅ ฉันใช้เวลากับครอบครัวและคนที่ฉันรักเพียงพอหรือเปล่า?', '✅ ฉันให้การช่วยเหลือพวกเขาในยามจำเป็นได้หรือไม่?', '✅ ฉันสื่อสารและเข้าใจกับคนรอบข้างได้ดีหรือไม่?', '✅ ฉันรู้สึกว่ามีคนสนับสนุนและอยู่เคียงข้างฉันหรือเปล่า?'], popupHint: '➡ ให้คะแนน 0-10 ตามคุณภาพความสัมพันธ์ของคุณ' },
  { label: '💑 ความสัมพันธ์เพื่อนฝูง (Relationship)', chartLabel: ['💑 เพื่อนฝูง', '(Relationship)'], color: '#4527A0', popupTitle: '🤔 ฉันมีความสัมพันธ์กับเพื่อนฝูงเป็นอย่างไร?', popupText: ['✅ ฉันมีเพื่อนที่สามารถพึ่งพาและไว้ใจได้หรือไม่?', '✅ ฉันมีการสื่อสารและใช้เวลากับเพื่อนอย่างสม่ำเสมอหรือไม่?', '✅ เวลาที่ฉันอยู่กับเพื่อน ฉันรู้สึกเติมเต็มและเป็นตัวเองได้หรือเปล่า?', '✅ เพื่อนของฉันเป็นพลังบวกและช่วยให้ฉันเติบโตขึ้นหรือไม่?'], popupHint: '➡ ให้คะแนน 0-10 ตามคุณภาพความสัมพันธ์เพื่อนฝูง' },
  { label: '💡 พัฒนาตนเอง (Personal Growth)', chartLabel: ['💡 พัฒนาตนเอง', '(Personal Growth)'], color: '#BF360C', popupTitle: '🤔 ฉันให้ความสำคัญกับการเรียนรู้และพัฒนาตัวเองไหม?', popupText: ['✅ ฉันได้เรียนรู้สิ่งใหม่ ๆ อย่างต่อเนื่องหรือไม่?', '✅ ฉันมีเป้าหมายหรือทิศทางในการพัฒนาตัวเองไหม?', '✅ ฉันได้ออกจากคอมฟอร์ตโซนเพื่อเติบโตหรือเปล่า?', '✅ ฉันมีทัศนคติที่ดีต่อความเปลี่ยนแปลงและการพัฒนาไหม?'], popupHint: '➡ ให้คะแนน 0-10 ตามการเติบโตของตัวเอง' },
  { label: '🧘‍♀️ พัฒนาจิตใจ (Spirituality)', chartLabel: ['🧘‍♀️ พัฒนาจิตใจ', '(Spirituality)'], color: '#37474F', popupTitle: '🤔 ฉันมีสภาพจิตใจเป็นอย่างไร?', popupText: ['✅ ฉันสามารถจัดการกับความเครียดและอารมณ์เชิงลบได้ดีแค่ไหน?', '✅ ฉันใช้เวลากับตัวเองเพื่อสะท้อนความคิด ฝึกสติ หรือฝึกสมาธิหรือไม่?', '✅ ฉันสามารถให้อภัยตัวเองและผู้อื่นได้หรือเปล่า?', '✅ ฉันรู้สึกขอบคุณสิ่งต่างๆ ในชีวิตและมองโลกในแง่บวกหรือไม่?'], popupHint: '➡ ให้คะแนน 0-10 ตามสภาพจิตใจของคุณ' },
  { label: '🌏 ช่วยเหลือสังคม (Social & Contribution)', chartLabel: ['🌏 ช่วยเหลือสังคม', '(Contribution)'], color: '#1565C0', popupTitle: '🤔 ฉันได้ทำสิ่งดีๆ เพื่อคนอื่นและสังคมอะไรบ้างไหม?', popupText: ['✅ ฉันมีส่วนร่วมในการช่วยเหลือหรือทำประโยชน์ให้ผู้อื่นบ้างหรือไม่?', '✅ ฉันมีเวลาหรือทรัพยากรที่แบ่งปันให้กับสังคม เช่น การบริจาค หรือจิตอาสาหรือไม่?', '✅ ฉันช่วยเหลือเพื่อน ครอบครัว หรือคนรอบตัวโดยไม่หวังผลตอบแทนหรือเปล่า?', '✅ ฉันรู้สึกว่าตัวเองมีคุณค่าต่อสังคมและสร้างผลกระทบที่ดีให้กับโลกหรือไม่?'], popupHint: '➡ ให้คะแนน 0-10 ตามความพึงพอใจในตัวคุณเองต่อสังคม' }
];

const categories = categoriesData.map(item => item.chartLabel);
const categoryColors = categoriesData.map(item => item.color);

// ✅ ตัวจัดรูปแบบข้อความ AI (เวอร์ชันแก้ปัญหา Header กลืนเนื้อหา และลดขนาดฟอนต์)
const formatAnalysisText = (text) => {
  if (!text) return null;

  return text.split('\n').map((line, index) => {
    const trimmedLine = line.trim();
    if (trimmedLine === '') return <div key={index} style={{ height: '8px' }}></div>;

    // 1. ตรวจสอบว่าเป็นบรรทัดที่มี Emoji หัวข้อหรือไม่
    const isHeaderLine = trimmedLine.match(/^(📌|💡|📅|🔥)/);
    
    let contentToProcess = trimmedLine;
    let headerElement = null;

    if (isHeaderLine) {
      // พยายามแยก "หัวข้อ" ออกจาก "เนื้อหา" (แยกด้วย : )
      const colonIndex = trimmedLine.indexOf(':');
      if (colonIndex !== -1 && colonIndex < 40) { 
        const headerPart = trimmedLine.substring(0, colonIndex + 1);
        contentToProcess = trimmedLine.substring(colonIndex + 1).trim();
        
        headerElement = (
          <div style={{
            marginTop: '16px',
            marginBottom: '6px',
            paddingBottom: '4px',
            borderBottom: '1px dashed #ffcccc',
            color: '#800000',
            fontSize: '14px',
            fontWeight: '700',
            textAlign: 'left'
          }}>
            {headerPart.replace(/\*\*/g, '')}
          </div>
        );
      } else {
        // ถ้าไม่มี : ให้ถือว่าเป็นหัวข้อทั้งบรรทัดตามเดิม
        return (
          <div key={index} style={{
            marginTop: '16px',
            marginBottom: '6px',
            paddingBottom: '4px',
            borderBottom: '1px dashed #ffcccc',
            color: '#800000',
            fontSize: '14px',
            fontWeight: '700',
            textAlign: 'left'
          }}>
            {trimmedLine.replace(/\*\*/g, '')}
          </div>
        );
      }
    }

    // 2. ฟังก์ชันจัดการเนื้อหา (แยกส่วนไฮไลต์ **...**)
    const renderContent = (text) => {
      const parts = text.split('**');
      return parts.map((part, i) =>
        i % 2 === 1 ? (
          // ส่วนที่อยู่ใน ** (หนา + มีพื้นหลัง)
          <span key={i} style={{
            color: '#800000',
            backgroundColor: '#fff0f0',
            padding: '1px 5px',
            borderRadius: '5px',
            fontWeight: '600',
            margin: '0 2px',
            display: 'inline-block',
            lineHeight: '1.2'
          }}>
            {part}
          </span>
        ) : (
          // ส่วนปกติ (บังคับบางพิเศษ 300 หรือ 400 เพื่อสร้าง Contrast)
          <span key={i} style={{ fontWeight: '300', color: '#444' }}>
            {part}
          </span>
        )
      );
    };

    const isListItem = trimmedLine.startsWith('-') || trimmedLine.match(/^\d+\./);

    return (
      <div key={index} style={{ textAlign: 'left' }}>
        {headerElement}
        {contentToProcess && (
          <div style={{
            marginBottom: '5px',
            paddingLeft: isListItem ? '12px' : '0',
            lineHeight: '1.7',
            fontSize: '12px', // ✅ ลดขนาดฟอนต์ลงตามคำขอ
            color: '#444'
          }}>
            {renderContent(contentToProcess)}
          </div>
        )}
      </div>
    );
  });
};
// --- 2. Dashboard Component ---
function Dashboard({ onBack }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const q = query(collection(db, "user_reports"), orderBy("timestamp", "desc"));
        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setReports(data);
      } catch (error) { console.error(error); } finally { setLoading(false); }
    };
    fetchReports();
  }, []);

  if (loading) return <div className="app-container"><div className="card"><p>กำลังดึงข้อมูล...</p></div></div>;

  return (
    <div className="app-container" style={{ display: 'block', overflowY: 'auto', paddingTop: '40px' }}>
      <div className="card" style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'left' }}>
        <h2 style={{ color: '#800000', fontSize: '20px' }}>📊 Admin Dashboard</h2>
        <p style={{ fontSize: '14px' }}>จำนวนผู้ใช้งานทั้งหมด: <strong>{reports.length}</strong> คน</p>
        <button className="secondary-btn" onClick={onBack} style={{ marginBottom: '20px', width: 'auto', padding: '8px 16px', fontSize: '13px' }}>กลับหน้าหลัก</button>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead><tr style={{ backgroundColor: '#800000', color: 'white' }}><th style={{ padding: '8px' }}>วันที่</th><th style={{ padding: '8px' }}>Email</th><th style={{ padding: '8px' }}>เป้าหมาย</th><th style={{ padding: '8px' }}>คะแนนเฉลี่ย</th></tr></thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.id} style={{ borderBottom: '1px solid #eee' }}><td style={{ padding: '8px' }}>{report.timestamp?.toDate ? report.timestamp.toDate().toLocaleDateString('th-TH') : '-'}</td><td style={{ padding: '8px', fontWeight: 'bold' }}>{report.email}</td><td style={{ padding: '8px' }}>{report.goal?.substring(0, 40)}...</td><td style={{ padding: '8px', textAlign: 'center' }}>{report.currentScores ? (report.currentScores.reduce((a, b) => a + b, 0) / 8).toFixed(1) : '-'}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Component จำลองรถ (เวอร์ชันแก้ไขล้อหมุนให้เห็นชัดเจน)
function CarSimulation({ scores }) {
    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);
    const diff = maxScore - minScore; 
    const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    
    let shakeIntensity = 0;
    let message = "";
    let explanation = "";
    let statusColor = "";
    
    if (diff <= 2.5) {
        shakeIntensity = 0; 
        statusColor = "#198754"; 
        if (averageScore >= 7.5) {
            message = "🚀 สมรรถนะระดับ Supercar!";
            explanation = "ยอดเยี่ยมกริบ! วงล้อชีวิตของคุณทั้ง 'กลม' และ 'ใหญ่' รถคันนี้วิ่งนิ่งสนิทและพุ่งทะยานด้วยความเร็วสูง คุณมีศักยภาพที่จะพาตัวเองไปถึงเป้าหมายได้ในเวลาอันรวดเร็วครับ";
        } else if (averageScore >= 4.5) {
            message = "🚗 สมรรถนะระดับ City Car";
            explanation = "สมดุลดีมากครับ! รถของคุณวิ่งนิ่งและมั่นคง แต่ด้วยขนาดวงล้อระดับกลาง ทำให้พละกำลังอาจไม่หวือหวา การพัฒนาคะแนนในภาพรวมจะช่วยให้รถคันนี้ทรงพลังขึ้นครับ";
        } else {
            message = "🚲 สมรรถนะระดับรถจักรยาน";
            explanation = "ล้อของคุณสมดุลดีเยี่ยมครับ แต่ขนาดพละกำลังยังเล็กไปนิด ทำให้การเดินทางไกลต้องใช้แรงเหนื่อยกว่าคนอื่น ลองหาจุดโฟกัสเพื่อเพิ่มขนาดวงล้อให้ชีวิตพุ่งไปได้ไกลและไวกว่าเดิมนะครับ";
        }
    } else {
        shakeIntensity = diff > 5 ? 5 : 2;
        statusColor = "#E63946"; 
        message = "⚠️ เครื่องยนต์สั่นคลอนและติดขัด";
        explanation = "ชีวิตคุณตอนนี้มีความแตกต่างของแต่ละด้านมากเกินไป เหมือนรถที่ล้อแต่ละข้างขนาดไม่เท่ากัน ทำให้เครื่องยนต์เดินไม่เรียบและเสียพลังงานระหว่างทางเยอะมาก ลองหันมาซ่อมแซมล้อที่คะแนนน้อยก่อนนะครับ";
    }

    const wheelScale = 0.6 + (averageScore / 10) * 0.6;
    const spinSpeed = 2.5 - (averageScore / 10) * 2; // ยิ่งคะแนนสูง ล้อจะหมุนเร็วขึ้น

    const shakeAnimation = `
        @keyframes driveShake {
            0% { transform: translateY(0px) rotate(0deg); }
            25% { transform: translateY(-${shakeIntensity}px) rotate(-${shakeIntensity/3}deg); }
            50% { transform: translateY(${shakeIntensity}px) rotate(${shakeIntensity/3}deg); }
            100% { transform: translateY(0px) rotate(0deg); }
        }
        @keyframes wheelSpin {
            from { transform: scale(${wheelScale}) rotate(0deg); }
            to { transform: scale(${wheelScale}) rotate(360deg); }
        }
        @keyframes roadMove {
            from { background-position: 0 0; }
            to { background-position: -60px 0; }
        }
    `;

    const carBodyStyle = {
        width: '140px', height: '70px', backgroundColor: '#E63946', 
        borderRadius: '60px 50px 10px 10px', position: 'relative', zIndex: 2,
        animation: `driveShake ${shakeIntensity > 0 ? 0.3 : 0}s infinite`,
        boxShadow: 'inset -5px -5px 15px rgba(0,0,0,0.2)', margin: '0 auto'
    };

    const wheelStyle = {
        width: '38px', height: '38px', backgroundColor: '#2B2D42', borderRadius: '50%',
        position: 'absolute', bottom: '-15px', border: '4px solid #fff',
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        animation: `wheelSpin ${spinSpeed}s linear infinite`,
        overflow: 'hidden'
    };

    // ✅ เพิ่มซี่ล้อ เพื่อให้เห็นการหมุน
    const wheelSpoke = {
        position: 'absolute', width: '100%', height: '2px', backgroundColor: 'rgba(255,255,255,0.3)'
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '10px', padding: '20px', backgroundColor: '#fafafa', borderRadius: '15px', border: '1px solid #eee', overflow: 'hidden' }}>
            <style>{shakeAnimation}</style>
            <h3 style={{color: '#4A0000', marginBottom: '5px', fontSize: '15px'}}>🚗 ภาพจำลองสมรรถนะชีวิตของคุณ</h3>
            
            <div style={{...carBodyStyle, marginTop: '15px'}}>
                <div style={{width: '35px', height: '25px', backgroundColor: '#F1FAEE', position: 'absolute', top: '15px', left: '25px', borderRadius: '20px 5px 5px 5px', border: '2px solid #E63946'}}></div>
                <div style={{width: '35px', height: '25px', backgroundColor: '#F1FAEE', position: 'absolute', top: '15px', right: '30px', borderRadius: '5px 15px 5px 5px', border: '2px solid #E63946'}}></div>
                
                {/* ล้อหน้า */}
                <div style={{...wheelStyle, left: '15px'}}>
                    <div style={wheelSpoke}></div>
                    <div style={{...wheelSpoke, transform: 'rotate(90deg)'}}></div>
                    <div style={{width:'8px', height:'8px', backgroundColor:'#ccc', borderRadius:'50%', zIndex: 3}}></div>
                </div>

                {/* ล้อหลัง */}
                <div style={{...wheelStyle, right: '15px'}}>
                    <div style={wheelSpoke}></div>
                    <div style={{...wheelSpoke, transform: 'rotate(90deg)'}}></div>
                    <div style={{width:'8px', height:'8px', backgroundColor:'#ccc', borderRadius:'50%', zIndex: 3}}></div>
                </div>
            </div>

            {/* ถนนที่ขยับได้ */}
            <div style={{ 
                width: '100%', height: '6px', backgroundColor: '#555', marginTop: '18px', borderRadius: '3px',
                backgroundImage: 'linear-gradient(90deg, transparent 50%, #FFD166 50%)', 
                backgroundSize: '30px 6px',
                backgroundRepeat: 'repeat-x',
                animation: 'roadMove 0.5s linear infinite'
            }}></div>

            <div style={{ marginTop: '20px', padding: '15px', backgroundColor: `${statusColor}10`, border: `1px solid ${statusColor}50`, borderRadius: '10px', textAlign: 'left' }}>
                <p style={{ color: statusColor, fontWeight: 'bold', fontSize: '15px', margin: '0 0 8px 0', textAlign: 'center' }}>{message}</p>
                <p style={{ fontSize: '12.5px', color: '#555', lineHeight: '1.5', margin: 0 }}>{explanation}</p>
            </div>
        </div>
    );
}

// --- 3. Main App Component ---
function App() {
  const chartRef = useRef(null);
  const [step, setStep] = useState('home'); 
  const [currentScores, setCurrentScores] = useState(Array(8).fill(5));
  const [targetScores, setTargetScores] = useState(Array(8).fill(5));
  const [selectedFocusAreas, setSelectedFocusAreas] = useState([]);
  const [showInfoPopup, setShowInfoPopup] = useState(null);

  const [email, setEmail] = useState('');
  const [futureGoal, setFutureGoal] = useState('');
  const [aiAnalysis, setAiAnalysis] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false); 
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleScoreChange = (type, index, value) => {
    const val = parseInt(value);
    if (type === 'current') {
      const newScores = [...currentScores];
      newScores[index] = val;
      setCurrentScores(newScores);
    } else {
      const newScores = [...targetScores];
      newScores[index] = val;
      setTargetScores(newScores);
    }
  };

  const sendReportViaEmail = async () => {
    if (!import.meta.env.VITE_EMAILJS_SERVICE_ID) return;
    if (!email) return alert("กรุณากรอก Email ก่อนครับ");
    setIsSendingEmail(true);
    try {
      await addDoc(collection(db, "user_reports"), { email, currentScores, targetScores, selectedFocusAreas, analysis: aiAnalysis, goal: futureGoal, timestamp: serverTimestamp(), platform: 'upskillwheel_v2' });
      const templateParams = { to_email: email, analysis_result: aiAnalysis, user_goal: futureGoal, from_name: "อัพสกิลกับฟุ้ย" };
      await emailjs.send(import.meta.env.VITE_EMAILJS_SERVICE_ID, import.meta.env.VITE_EMAILJS_TEMPLATE_ID, templateParams, import.meta.env.VITE_EMAILJS_PUBLIC_KEY);
      alert("🚀 ส่งรีพอร์ตเรียบร้อย! ลองเช็กใน Inbox นะครับ");
    } catch (error) { alert("ระบบบันทึกข้อมูลแล้ว แต่การส่งเมลขัดข้องเล็กน้อยครับ"); } finally { setIsSendingEmail(false); }
  };

  const analyzeWithAI = async () => {
    if (!futureGoal.trim()) { alert("รบกวนพิมพ์เป้าหมายหลักใน 1 ปีของคุณก่อนนะครับ AI จะได้ช่วยวิเคราะห์ได้แม่นยำขึ้นครับ"); return; }
    setIsAnalyzing(true);
    const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${API_KEY}`;
    
    const currentText = categoriesData.map((item, i) => `${item.label}: ${currentScores[i]}/10`).join(", ");
    const targetText = categoriesData.map((item, i) => `${item.label}: ${targetScores[i]}/10`).join(", ");
    const focusText = selectedFocusAreas.length > 0 ? selectedFocusAreas.map(i => categoriesData[i].label).join(", ") : "ไม่ได้ระบุเป็นพิเศษ";

    const prompt = `คุณคือเพื่อนสนิทที่ฉลาดและเชี่ยวชาญการใช้ชีวิตทั้ง 8 ด้าน (Life Coach & Business Mentor) สไตล์การพูดคือเป็นกันเอง อบอุ่น จริงใจ ให้กำลังใจ
วิเคราะห์คะแนน Wheel of Life ของเพื่อนคุณ: ปัจจุบัน ${currentText}, เป้าหมาย 1 ปี ${targetText}
เป้าหมาย 1 ปีที่เพื่อนอยากทำให้สำเร็จคือ: ${futureGoal}
**สิ่งที่เพื่อนเลือกโฟกัสเป็นพิเศษในปีนี้คือ:** [${focusText}]

กฎการตอบ:
ให้แบ่งการตอบออกเป็น 4 หัวข้อหลัก (ต้องขึ้นต้นบรรทัดด้วย Emoji เหล่านี้เท่านั้น ห้ามใช้ #):
📌 ภาพรวมของคุณ : ทักทายเพื่อน สรุปความสมดุลปัจจุบัน และบอกว่าด้านที่เขาเลือกโฟกัสจะช่วยพาเขาไปถึงเป้าหมายได้ยังไง
💡 คำแนะนำ (Tips) : ให้คำแนะนำหรือ Mindset เจ๋งๆ 1-2 ข้อ เพื่อปลดล็อกเรื่องที่เขาโฟกัส
📅 แผนลุย 7 วัน (Action Plan) : จัดตาราง 7 วัน (รูปแบบบรรทัดใหม่ขึ้นด้วย - Day X : ภารกิจสั้นๆ) เอาแบบเริ่มทำได้เลยตั้งแต่วันนี้
🔥 ข้อคิดส่งท้าย : ประโยคให้กำลังใจสั้นๆ ทรงพลัง

*อนุญาตให้ใช้ตัวหนา (ใส่เครื่องหมาย **ครอบคำ**) เพื่อเน้นคำสำคัญได้ แต่อย่าใช้ Markdown แบบอื่นๆ*`;

    try {
      const response = await fetch(API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) });
      const data = await response.json();
      setAiAnalysis(data.candidates[0].content.parts[0].text);
    } catch (error) { alert("AI ผิดพลาด ลองใหม่อีกครั้งนะครับ"); } finally { setIsAnalyzing(false); }
  };

  // ✅ ระบบแชร์รูปกราฟลง Social (ใช้ Web Share API)
  const shareChartImage = async () => {
    if (!chartRef.current) return;
    const canvas = chartRef.current.canvas;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width + 40; 
    tempCanvas.height = canvas.height + 140; 
    const tCtx = tempCanvas.getContext('2d');
    
    tCtx.fillStyle = 'white';
    tCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    
    tCtx.font = "bold 26px Kanit";
    tCtx.fillStyle = "#800000";
    tCtx.textAlign = "center";
    tCtx.fillText("Wheel Of Life Analysis", tempCanvas.width / 2, 50);

    tCtx.drawImage(canvas, 20, 80);
    
    tCtx.font = "600 20px Kanit";
    tCtx.fillStyle = "#800000";
    tCtx.textAlign = "center";
    tCtx.fillText("Created by อัพสกิลกับฟุ้ย", tempCanvas.width / 2, tempCanvas.height - 25);
    
    // แปลง Canvas เป็น Blob เพื่อแชร์หรือดาวน์โหลด
    tempCanvas.toBlob(async (blob) => {
        const file = new File([blob], "wheel-of-life.png", { type: "image/png" });
        
        // เช็คว่ามือถือรองรับการแชร์ไฟล์รูปไหม
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            try {
                await navigator.share({
                    title: 'My Wheel of Life',
                    text: `เป้าหมายปีนี้ของฉันคือ: ${futureGoal} 🎯\nมาลองประเมินสมดุลชีวิตกัน!`,
                    files: [file]
                });
            } catch (error) {
                console.log('Share canceled or failed', error);
            }
        } else {
            // ถ้าไม่รองรับ (เช่นในคอม) ให้ดาวน์โหลดรูปแทน
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'my-life-wheel.png';
            link.click();
        }
    }, 'image/png');
  };

  return (
    <div className="app-container" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px 0' }}>
        
        {step === 'home' && (
          <div className="card">
            <h1 style={{ fontSize: '40px' }}>Wheel Of Life</h1>
            <p style={{ fontSize: '14px' }}>ประเมินชีวิตปัจจุบัน และตั้งเป้าหมายอัปสกิลชีวิตในอีก 1 ปีข้างหน้า</p>
            <button className="primary-btn" onClick={() => { setStep('assess_current'); setCurrentScores(Array(8).fill(5)); setTargetScores(Array(8).fill(5)); setSelectedFocusAreas([]); setFutureGoal(""); setAiAnalysis(""); }}>เริ่มประเมิน</button>
<Footer />
          </div>
        )}

        {step === 'assess_current' && (
          <div className="card" style={{ maxWidth: '600px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
              <h2 style={{ margin: 0, fontSize: '18px' }}>ประเมินชีวิตปัจจุบัน</h2><span style={{ fontSize: '11px', backgroundColor: '#800000', color: 'white', padding: '3px 8px', borderRadius: '10px' }}>Step 1/2</span>
            </div>
            <p style={{fontSize:'13px', color:'#666', marginBottom:'20px'}}>ให้คะแนน (0-10) ความพึงพอใจในแต่ละด้าน ณ ปัจจุบัน</p>
            
            <div className="sliders-container" style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: '10px' }}>
              {categoriesData.map((item, index) => (
                <div key={item.label} className="slider-group" style={{ marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap' }}>
                    <label style={{ fontWeight: 'bold', fontSize: '15px', margin: 0, color: '#333' }}>{item.label}</label>
                    <span onClick={() => setShowInfoPopup(index)} style={{ marginLeft: '10px', cursor: 'pointer', color: '#800000', fontSize: '11px', backgroundColor: '#fff5f5', padding: '3px 10px', borderRadius: '15px', border: '1px solid #f08080' }}>ℹ️ ไกด์ประเมิน</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <span style={{ fontSize: '13px', width: '60px', flexShrink: 0 }}>ปัจจุบัน:</span>
                    <input type="range" min="0" max="10" value={currentScores[index]} onChange={(e) => handleScoreChange('current', index, e.target.value)} style={{ accentColor: '#800000', flex: 1 }} />
                    <span style={{ fontWeight: 'bold', width: '25px', color: '#800000', fontSize: '15px', textAlign: 'right' }}>{currentScores[index]}</span>
                  </div>
                </div>
              ))}
            </div>
            <button className="primary-btn" onClick={() => { setTargetScores([...currentScores]); setStep('assess_target'); }} style={{ marginTop: '20px' }}>ถัดไป: ตั้งเป้าหมาย 1 ปี ➡️</button>
<Footer />          
</div>
        )}

        {step === 'assess_target' && (
          <div className="card" style={{ maxWidth: '600px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
              <h2 style={{ margin: 0, fontSize: '18px' }}>เป้าหมายอัปสกิล 1 ปี</h2><span style={{ fontSize: '11px', backgroundColor: '#800000', color: 'white', padding: '3px 8px', borderRadius: '10px' }}>Step 2/2</span>
            </div>
            
            <div style={{ backgroundColor: '#fffbe6', padding: '12px', borderRadius: '8px', borderLeft: '4px solid #ffcc00', marginBottom: '15px', marginTop: '10px', textAlign: 'left', fontSize: '12.5px', color: '#555', lineHeight: '1.5' }}>
              💡 <strong>Guideline การตั้งเป้าหมาย:</strong><br/>
              1. <strong>คลิกเลือก</strong> ด้านที่อยากพัฒนาที่สุด 1-3 ด้าน<br/>
              2. เลื่อนคะแนนให้ <strong>"ท้าทายแต่ทำได้จริง"</strong> (ปัจจุบัน 5 ตั้งเป้า 7 หรือ 8)<br/>
              3. <strong>พิมพ์เป้าหมายหลัก</strong> ที่อยากทำให้สำเร็จลงในกล่องข้อความ
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '20px' }}>
              {categoriesData.map((item, index) => {
                const isSelected = selectedFocusAreas.includes(index);
                return (
                  <button key={`btn-${index}`} onClick={() => {
                       if (isSelected) {
                          setSelectedFocusAreas(selectedFocusAreas.filter(i => i !== index));
                          const newTargets = [...targetScores]; newTargets[index] = currentScores[index]; setTargetScores(newTargets);
                       } else {
                          if (selectedFocusAreas.length < 3) {
                             setSelectedFocusAreas([...selectedFocusAreas, index]);
                             const newTargets = [...targetScores]; newTargets[index] = Math.min(10, currentScores[index] + 1); setTargetScores(newTargets);
                          } else { alert("คุณเลือกโฟกัสครบ 3 ด้านแล้วครับ โฟกัสทีละนิดชีวิตจะพุ่งไวกว่านะ! 🚀"); }
                       }
                    }}
                    style={{ padding: '6px 10px', borderRadius: '15px', border: isSelected ? `2px solid ${item.color}` : '1px solid #ddd', backgroundColor: isSelected ? `${item.color}15` : '#fff', color: isSelected ? '#4A0000' : '#666', cursor: 'pointer', fontSize: '12px', fontWeight: isSelected ? 'bold' : 'normal', transition: 'all 0.2s', flexGrow: 1, textAlign: 'center' }}
                  >
                    {isSelected && '✅ '} {item.label.split(' ')[1]}
                  </button>
                )
              })}
            </div>

            {selectedFocusAreas.length > 0 ? (
                <div className="sliders-container" style={{ maxHeight: '30vh', overflowY: 'auto', paddingRight: '10px' }}>
                  <h3 style={{fontSize: '13px', color: '#4A0000', marginBottom: '10px', borderBottom: '1px solid #eee', paddingBottom: '8px'}}>ปรับคะแนนเป้าหมายที่คุณเลือก 🎯</h3>
                  {selectedFocusAreas.map((index) => {
                    const item = categoriesData[index];
                    return (
                        <div key={`target-${index}`} className="slider-group" style={{ marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '12px' }}>
                          <label style={{ fontWeight: 'bold', fontSize: '15px', display: 'block', marginBottom: '8px', color: '#333' }}>{item.label} <span style={{fontSize:'11px', color:'#999', fontWeight:'normal'}}>(ปัจจุบัน: {currentScores[index]})</span></label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <span style={{ fontSize: '13px', width: '60px', color: '#ff6666', flexShrink: 0 }}>เป้าหมาย:</span>
                            <input type="range" min="0" max="10" value={targetScores[index]} onChange={(e) => handleScoreChange('target', index, e.target.value)} style={{ accentColor: '#ff6666', flex: 1 }} />
                            <span style={{ fontWeight: 'bold', width: '25px', color: '#ff6666', fontSize: '15px', textAlign: 'right' }}>{targetScores[index]}</span>
                          </div>
                        </div>
                    )
                  })}
                </div>
            ) : (
                <div style={{ textAlign: 'center', padding: '10px', color: '#999', fontSize: '13px' }}>👆 คลิกเลือกด้านบนเพื่อเริ่มตั้งเป้าหมาย</div>
            )}
            
            <div style={{ marginTop: '10px', textAlign: 'left' }}>
              <label style={{ fontWeight: 'bold', fontSize: '13px', color: '#800000', display: 'block', marginBottom: '6px' }}>✍️ สิ่งที่อยากทำให้สำเร็จใน 1 ปีนี้ (เป้าหมายหลัก):</label>
              <textarea className="goal-input" placeholder="เช่น อยากเพิ่มรายได้ 20k/เดือน, อยากลดน้ำหนัก 5 kg, หรืออยากมีเวลาว่างเสาร์-อาทิตย์..." value={futureGoal} onChange={(e) => setFutureGoal(e.target.value)} style={{ minHeight: '70px', width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '13px' }} />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
              <button className="secondary-btn" onClick={() => setStep('assess_current')} style={{ flex: 1, padding: '10px' }}>กลับ</button>
              <button className="primary-btn" onClick={() => {
                    if(selectedFocusAreas.length === 0) { if(!window.confirm('คุณยังไม่ได้เลือกด้านที่จะโฟกัสเลย ต้องการวิเคราะห์ผลลัพธ์เลยหรือไม่?')) return; }
                    if(!futureGoal.trim()) { alert("อย่าลืมพิมพ์เป้าหมายหลักของคุณในช่องด้านล่างนะครับ AI จะได้ช่วยวางแผนให้ตรงจุดครับ"); return; }
                    setStep('result');
                }} style={{ flex: 2, padding: '10px', opacity: (selectedFocusAreas.length > 0 && futureGoal.trim().length > 0) ? 1 : 0.7 }}
              >วิเคราะห์ผลลัพธ์ ✨</button>
            </div>
<Footer />
          </div>
        )}

        {showInfoPopup !== null && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
            <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '15px', width: '90%', maxWidth: '350px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)', textAlign: 'left', maxHeight: '80vh', overflowY: 'auto' }}>
              <h3 style={{ marginTop: 0, color: categoriesData[showInfoPopup].color, borderBottom: '1px solid #eee', paddingBottom: '8px', fontSize: '16px' }}>{categoriesData[showInfoPopup].label}</h3>
              <p style={{ fontWeight: 'bold', fontSize: '14px', color: '#333', margin: '10px 0' }}>{categoriesData[showInfoPopup].popupTitle}</p>
              <ul style={{ paddingLeft: '0', fontSize: '13px', lineHeight: '1.6', color: '#555', marginTop: '10px' }}>{categoriesData[showInfoPopup].popupText.map((t, i) => (<li key={i} style={{ listStyleType: 'none', marginBottom: '8px' }}>{t}</li>))}</ul>
              <div style={{ backgroundColor: '#fff5f5', padding: '8px', borderRadius: '8px', marginTop: '15px', textAlign: 'center' }}><p style={{ fontWeight: 'bold', fontSize: '13px', color: '#800000', margin: 0 }}>{categoriesData[showInfoPopup].popupHint}</p></div>
              <button className="primary-btn" onClick={() => setShowInfoPopup(null)} style={{ width: '100%', marginTop: '15px', borderRadius: '20px', padding: '8px' }}>เข้าใจแล้ว</button>
            </div>
          </div>
        )}

        {step === 'result' && (
          <div className="card">
            <h2 style={{ fontSize: '30px' }}>Wheel Of Life Analysis</h2>
            
            {/* ✅ เปลี่ยนเป็นปุ่ม แชร์ / เซฟรูปกราฟ */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '15px' }}>
                <button className="secondary-btn" onClick={shareChartImage} style={{ padding: '8px 20px', fontSize: '13px', backgroundColor: 'white', border: '1px solid #800000', color: '#800000', borderRadius: '25px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12.5px' }}>📤</span> แชร์รูปกราฟลง Social
                </button>
            </div>
            
            <div style={{ position: 'relative', width: '100%' }}>
              <div className="chart-container" style={{ height: isMobile ? '300px' : '400px' }}>
                 <Radar 
                    ref={chartRef} 
                    data={{
                      labels: categories,
                      datasets: [
                        { label: 'ปัจจุบัน', data: currentScores, backgroundColor: 'rgba(128, 0, 0, 0.2)', borderColor: '#800000', borderWidth: 2, pointBackgroundColor: '#800000', pointStyle: 'circle', fill: true },
                        { label: 'เป้าหมาย 1 ปี', data: targetScores, backgroundColor: 'rgba(255, 102, 102, 0.1)', borderColor: '#ff6666', borderWidth: 2, borderDash: [5, 5], pointBackgroundColor: '#ff6666', pointStyle: 'circle', fill: true }
                      ]
                    }} 
                    options={{ 
                      maintainAspectRatio: false, 
                      layout: { padding: isMobile ? 35 : 50 }, 
                      plugins: { legend: { display: true, position: 'bottom', labels: { usePointStyle: true, font: { family: 'Kanit', size: 11 } } } },
                      scales: { r: { min: 0, max: 10, beginAtZero: true, ticks: { display: false }, pointLabels: { padding: 8, font: { family: 'Kanit', size: isMobile ? 11 : 13, weight: '600' }, color: (context) => categoryColors[context.index] } } } 
                    }} 
                  />
              </div>
            </div>

            <CarSimulation scores={currentScores} />

            <div style={{ marginTop: '20px' }}>
              {!isAnalyzing ? (
                <button className="primary-btn" onClick={analyzeWithAI} style={{ width: '100%' }}>✨ AI วิเคราะห์ผล & จัดตาราง 7 วัน</button>
              ) : (
                <div style={{ textAlign: 'center', padding: '15px', backgroundColor: '#fff5f5', borderRadius: '15px', border: '2px dashed #f08080' }}>
                   <div className="lds-dual-ring-small"></div>
                   <p className="blinking-text" style={{ fontSize: '12px', color: '#800000', marginTop: '10px' }}>AI กำลังจัดตาราง 7 วันให้คุณ...</p>
                </div>
              )}
            </div>

            {/* ✅ ผลวิเคราะห์ AI ที่ผ่านการจัดฟอร์แมตให้อ่านง่าย ฟอนต์สมส่วน */}
            {aiAnalysis && (
              <div className="ai-result-section">
                <div className="recommendation" style={{ marginTop: '20px', textAlign: 'left', backgroundColor: '#fff', border: '1px solid #eee', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', padding: '20px', borderRadius: '15px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                    <strong style={{ color: '#800000', fontSize: '16px' }}>🪄 ผลวิเคราะห์ Exclusive</strong>
                  </div>
                  <div>
                    {formatAnalysisText(aiAnalysis)}
                  </div>
                </div>
              </div>
            )}

            <div style={{ marginTop: '20px' }}>
              <input type="email" placeholder="กรอก Email เพื่อรับรีพอร์ตเก็บไว้..." value={email} onChange={(e) => setEmail(e.target.value)} className="goal-input" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '13px' }} />
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                  {!isSendingEmail ? (
                    <button className="primary-btn" onClick={sendReportViaEmail} style={{ flex: 1, padding: '10px' }}>📧 ส่งรีพอร์ตเข้า Email</button>
                  ) : (
                    <div style={{ flex: 1, textAlign: 'center', padding: '10px', backgroundColor: '#fff5f5', borderRadius: '10px', border: '2px dashed #f08080' }}><div className="lds-dual-ring-small"></div><p className="blinking-text" style={{ fontSize: '12px', color: '#800000', margin: 0 }}>กำลังส่ง...</p></div>
                  )}
              </div>
            </div>
            
            <button className="secondary-btn" onClick={() => setStep('home')} style={{ marginTop: '10px', width: '100%', padding: '10px' }}>กลับหน้าแรก</button>
<Footer />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;