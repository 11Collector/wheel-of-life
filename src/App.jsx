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
import html2canvas from 'html2canvas';
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

const Footer = () => (
  <div style={{ textAlign: 'center', padding: '20px 0', color: '#800000', fontSize: '12px', opacity: 0.7, fontWeight: '300', letterSpacing: '0.5px', marginTop: 'auto' }}>
    Created by <strong>อัพสกิลกับฟุ้ย</strong>
  </div>
);

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend, whiteBackgroundPlugin);

const categoriesData = [
  { label: '❤️ สุขภาพ', chartLabel: ['❤️ สุขภาพ'], color: '#D32F2F', popupTitle: '🤔 ฉันดูแลสุขภาพตัวเองดีแค่ไหน?', popupText: ['✅ ฉันมีพฤติกรรมการกินที่ดีต่อสุขภาพไหม?', '✅ ฉันออกกำลังกายสม่ำเสมอหรือเปล่า?', '✅ ฉันนอนหลับเพียงพอและมีพลังงานในแต่ละวันไหม?', '✅ ฉันมีปัญหาสุขภาพที่ควรแก้ไขหรือไม่?'], popupHint: '➡ ให้คะแนน 0-10 ตามสุขภาพของคุณในปัจจุบัน' },
  { label: '💎 การเงิน', chartLabel: ['💎 การเงิน'], color: '#E65100', popupTitle: '🤔 ฉันบริหารเงินของตัวเองดีแค่ไหน?', popupText: ['✅ ฉันมีเงินออมและการลงทุนที่มั่นคงไหม?', '✅ ฉันสามารถรับมือกับค่าใช้จ่ายที่ไม่คาดคิดได้หรือไม่?', '✅ ฉันมีรายรับที่เพียงพอต่อการใช้ชีวิตที่ต้องการหรือเปล่า?', '✅ ฉันมีหนี้สินที่ควบคุมได้หรือไม่?'], popupHint: '➡ ให้คะแนน 0-10 ตามสถานะทางการเงินของคุณ' },
  { label: '💼 การงานหรือธุรกิจ', chartLabel: ['💼 การงาน'], color: '#00695C', popupTitle: '🤔 ฉันพอใจกับงานของตัวเองแค่ไหน?', popupText: ['✅ งานของฉันสอดคล้องกับเป้าหมายชีวิตของฉันไหม?', '✅ ฉันมีโอกาสเติบโตและพัฒนาทักษะในงานของฉันหรือไม่?', '✅ ฉันรู้สึกว่างานของฉันมีความหมายและสร้างคุณค่าไหม?', '✅ ฉันมีความสมดุลระหว่างชีวิตกับการทำงานหรือเปล่า?'], popupHint: '➡ ให้คะแนน 0-10 ตามความพึงพอใจในงานของคุณ' },
  { label: '👨‍👩‍👧‍👦 ครอบครัว', chartLabel: ['👨‍👩‍👧‍👦 ครอบครัว'], color: '#AD1457', popupTitle: '🤔 ฉันมีความสัมพันธ์ที่ดีและเติมเต็มกับครอบครัวไหม?', popupText: ['✅ ฉันใช้เวลากับครอบครัวและคนที่ฉันรักเพียงพอหรือเปล่า?', '✅ ฉันให้การช่วยเหลือพวกเขาในยามจำเป็นได้หรือไม่?', '✅ ฉันสื่อสารและเข้าใจกับคนรอบข้างได้ดีหรือไม่?', '✅ ฉันรู้สึกว่ามีคนสนับสนุนและอยู่เคียงข้างฉันหรือเปล่า?'], popupHint: '➡ ให้คะแนน 0-10 ตามคุณภาพความสัมพันธ์ของคุณ' },
  { label: '💑 ความสัมพันธ์เพื่อนฝูง', chartLabel: ['💑 เพื่อนฝูง'], color: '#4527A0', popupTitle: '🤔 ฉันมีความสัมพันธ์กับเพื่อนฝูงเป็นอย่างไร?', popupText: ['✅ ฉันมีเพื่อนที่สามารถพึ่งพาและไว้ใจได้หรือไม่?', '✅ ฉันมีการสื่อสารและใช้เวลากับเพื่อนอย่างสม่ำเสมอหรือไม่?', '✅ เวลาที่ฉันอยู่กับเพื่อน ฉันรู้สึกเติมเต็มและเป็นตัวเองได้หรือเปล่า?', '✅ เพื่อนของฉันเป็นพลังบวกและช่วยให้ฉันเติบโตขึ้นหรือไม่?'], popupHint: '➡ ให้คะแนน 0-10 ตามคุณภาพความสัมพันธ์เพื่อนฝูง' },
  { label: '💡 พัฒนาตนเอง', chartLabel: ['💡 พัฒนาตนเอง'], color: '#BF360C', popupTitle: '🤔 ฉันให้ความสำคัญกับการเรียนรู้และพัฒนาตัวเองไหม?', popupText: ['✅ ฉันได้เรียนรู้สิ่งใหม่ ๆ อย่างต่อเนื่องหรือไม่?', '✅ ฉันมีเป้าหมายหรือทิศทางในการพัฒนาตัวเองไหม?', '✅ ฉันได้ออกจากคอมฟอร์ตโซนเพื่อเติบโตหรือเปล่า?', '✅ ฉันมีทัศนคติที่ดีต่อความเปลี่ยนแปลงและการพัฒนาไหม?'], popupHint: '➡ ให้คะแนน 0-10 ตามการเติบโตของตัวเอง' },
  { label: '🧘‍♀️ พัฒนาจิตใจ', chartLabel: ['🧘‍♀️ จิตใจ'], color: '#37474F', popupTitle: '🤔 ฉันมีสภาพจิตใจเป็นอย่างไร?', popupText: ['✅ ฉันสามารถจัดการกับความเครียดและอารมณ์เชิงลบได้ดีแค่ไหน?', '✅ ฉันใช้เวลากับตัวเองเพื่อสะท้อนความคิด ฝึกสติ หรือฝึกสมาธิหรือไม่?', '✅ ฉันสามารถให้อภัยตัวเองและผู้อื่นได้หรือเปล่า?', '✅ ฉันรู้สึกขอบคุณสิ่งต่างๆ ในชีวิตและมองโลกในแง่บวกหรือไม่?'], popupHint: '➡ ให้คะแนน 0-10 ตามสภาพจิตใจของคุณ' },
  { label: '🌏 ช่วยเหลือสังคม', chartLabel: ['🌏 ช่วยสังคม'], color: '#1565C0', popupTitle: '🤔 ฉันได้ทำสิ่งดีๆ เพื่อคนอื่นและสังคมอะไรบ้างไหม?', popupText: ['✅ ฉันมีส่วนร่วมในการช่วยเหลือหรือทำประโยชน์ให้ผู้อื่นบ้างหรือไม่?', '✅ ฉันมีเวลาหรือทรัพยากรที่แบ่งปันให้กับสังคม เช่น การบริจาค หรือจิตอาสาหรือไม่?', '✅ ฉันช่วยเหลือเพื่อน ครอบครัว หรือคนรอบตัวโดยไม่หวังผลตอบแทนหรือเปล่า?', '✅ ฉันรู้สึกว่าตัวเองมีคุณค่าต่อสังคมและสร้างผลกระทบที่ดีให้กับโลกหรือไม่?'], popupHint: '➡ ให้คะแนน 0-10 ตามความพึงพอใจในตัวคุณเองต่อสังคม' }
];

const categories = categoriesData.map(item => item.chartLabel);
const categoryColors = categoriesData.map(item => item.color);

// ✅ ตัวจัดรูปแบบข้อความ AI
const formatAnalysisText = (text) => {
  if (!text) return null;

  return text.split('\n').map((line, index) => {
    const trimmedLine = line.trim();
    if (trimmedLine === '') return <div key={index} style={{ height: '8px' }}></div>;

    const isHeaderLine = trimmedLine.match(/^(📌|💡|📅|🔥)/);
    const isListItem = trimmedLine.startsWith('-');
    
    let contentToProcess = trimmedLine;
    let headerElement = null;

    if (isHeaderLine) {
      const colonIndex = trimmedLine.indexOf(':');
      if (colonIndex !== -1 && colonIndex < 40) { 
        const headerPart = trimmedLine.substring(0, colonIndex + 1);
        contentToProcess = trimmedLine.substring(colonIndex + 1).trim();
        headerElement = (
          <div style={{ marginTop: '16px', marginBottom: '8px', paddingBottom: '4px', borderBottom: '1px dashed #ffcccc', color: '#800000', fontSize: '15px', fontWeight: '700', textAlign: 'left' }}>
            {headerPart.replace(/\*\*/g, '')}
          </div>
        );
      } else {
        return (
          <div key={index} style={{ marginTop: '16px', marginBottom: '8px', paddingBottom: '4px', borderBottom: '1px dashed #ffcccc', color: '#800000', fontSize: '15px', fontWeight: '700', textAlign: 'left' }}>
            {trimmedLine.replace(/\*\*/g, '')}
          </div>
        );
      }
    }

    const renderContent = (textToRender) => {
      const parts = textToRender.split('**');
      return parts.map((part, i) =>
        i % 2 === 1 ? (
          <span key={i} style={{ color: '#800000', backgroundColor: '#fff0f0', padding: '1px 6px', borderRadius: '5px', fontWeight: '600', margin: '0 2px', display: 'inline-block', lineHeight: '1.2' }}>{part}</span>
        ) : (
          <span key={i} style={{ fontWeight: '300' }}>{part}</span>
        )
      );
    };

    return (
      <div key={index} style={{ textAlign: 'left' }}>
        {headerElement}
        {contentToProcess && (
          <div style={{ marginBottom: '8px', paddingLeft: isListItem ? '15px' : '0', lineHeight: '1.7', fontSize: '13px', color: '#444' }}>
            {renderContent(contentToProcess)}
          </div>
        )}
      </div>
    );
  });
};

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

function CarSimulation({ scores }) {
    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);
    const diff = maxScore - minScore; 
    const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    
    let shakeIntensity = 0;
    let message = "";
    let explanation = "";
    let statusColor = "";
    let vehicleEmoji = "🚗";
    let speedAnimation = "1s";
    
    if (diff <= 2.5) {
        shakeIntensity = 0; 
        statusColor = "#198754"; 
        if (averageScore >= 7.5) {
            message = "🚀 สมรรถนะระดับ Supercar!";
            explanation = "ยอดเยี่ยมมากครับ! วงล้อชีวิตของคุณทั้งใหญ่และสมดุล เหมือนซูเปอร์คาร์ที่เครื่องยนต์ทรงพลังและช่วงล่างแน่นหนา คุณพร้อมที่จะพุ่งชนเป้าหมายใหญ่ๆ ได้อย่างรวดเร็วและมั่นคงครับ";
            vehicleEmoji = "🏎️";
            speedAnimation = "0.2s";
        } else if (averageScore >= 4.5) {
            message = "🚗 สมรรถนะระดับ City Car";
            explanation = "ชีวิตตอนนี้สมดุลและมั่นคงดีมากครับ! เหมือนซิตี้คาร์ที่ขับขี่ได้ราบรื่น ปลอดภัย แต่อาจจะยังไม่ได้พุ่งทะยานฉับไวมากนัก ลองค่อยๆ อัปสกิลเพิ่มพลังในแต่ละด้าน เพื่ออัปเกรดเครื่องยนต์ให้แรงขึ้นนะครับ";
            vehicleEmoji = "🚙";
            speedAnimation = "0.6s";
        } else {
            message = "🚲 สมรรถนะระดับรถจักรยาน";
            explanation = "ชีวิตของคุณมีความสมดุลที่ดี ไม่เครียดจนเกินไปครับ แต่พละกำลังรวมอาจจะยังน้อยอยู่ เหมือนกำลังปั่นจักรยานที่ไปได้เรื่อยๆ แต่อาจจะต้องออกแรงเหนื่อยหน่อยถ้าจะไปเป้าหมายใหญ่ ลองหาจุดที่อยากจะติดเทอร์โบให้ชีวิตดูนะครับ";
            vehicleEmoji = "🚲";
            speedAnimation = "1.5s";
        }
    } 
    else if (diff <= 4.5) {
        shakeIntensity = 2; 
        statusColor = "#F4A261"; 
        message = "🚧 รถวิ่งกะเผลกเล็กน้อย";
        explanation = "ชีวิตช่วงนี้อาจระรู้สึกลุ่มๆ ดอนๆ ไปสักนิดครับ เหมือนรถที่ยางอ่อนไปข้างนึง เพราะมีบางด้านที่คุณให้ความสำคัญมาก แต่ดันลืมดูแลบางด้านไป ลองดึงด้านที่อ่อนแอขึ้นมาสักนิด จะช่วยให้ชีวิตขับเคลื่อนได้สมูทขึ้นเยอะเลยครับ";
        vehicleEmoji = "🛻";
        speedAnimation = "0.8s";
    } else {
        shakeIntensity = 5; 
        statusColor = "#E63946"; 
        message = "⚠️ เครื่องยนต์สั่นคลอนหนัก (เสี่ยงหมดไฟ)";
        explanation = "สัญญาณเตือนดังแล้วครับ! ตอนนี้ชีวิตคุณทุ่มเทให้กับบางสิ่งหนักมากจนละทิ้งด้านอื่นๆ ไปอย่างสิ้นเชิง เหมือนรถที่ล้อเบี้ยวจนสั่นสะเทือนรุนแรง ลองเหยียบเบรก พักหายใจ แล้วหันมาดูแลด้านที่ขาดหายไปก่อนที่เครื่องยนต์จะพังนะครับ";
        vehicleEmoji = "🚑";
        speedAnimation = "2s";
    }

    const shakeAnimation = `
        @keyframes vehicleShake {
            0% { transform: translateY(0px) rotate(0deg); }
            25% { transform: translateY(-${shakeIntensity}px) rotate(-${shakeIntensity/2}deg); }
            50% { transform: translateY(${shakeIntensity}px) rotate(${shakeIntensity/2}deg); }
            100% { transform: translateY(0px) rotate(0deg); }
        }
        @keyframes vehicleBounce {
            from { transform: translateY(0px); }
            to { transform: translateY(-8px); }
        }
        @keyframes roadMoveFast {
            from { background-position: 0 0; }
            to { background-position: -60px 0; }
        }
    `;

    const shareVehicleImage = async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 600;
      canvas.height = 500;
      const ctx = canvas.getContext('2d');

      ctx.fillStyle = '#fdf2f2';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = '#ffcccc';
      ctx.lineWidth = 8;
      ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

      ctx.font = "bold 32px Kanit, sans-serif";
      ctx.fillStyle = "#800000";
      ctx.textAlign = "center";
      ctx.fillText("สมรรถนะชีวิตของฉันคือ...", canvas.width / 2, 70);

      ctx.font = "140px 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif";
      ctx.save();
      ctx.translate(canvas.width / 2, 240);
      ctx.scale(-1, 1);
      ctx.fillText(vehicleEmoji, 0, 0);
      ctx.restore();

      ctx.font = "bold 26px Kanit, sans-serif";
      ctx.fillStyle = statusColor;
      ctx.fillText(message.replace(/🚀|🚗|🚲|🚧|⚠️/g, '').trim(), canvas.width / 2, 330);

      ctx.font = "20px Kanit, sans-serif";
      ctx.fillStyle = "#444";
      ctx.fillText(`พร้อมจะอัปสกิลชีวิตไปกับ Wheel of Life!`, canvas.width / 2, 380);

      ctx.font = "600 18px Kanit, sans-serif";
      ctx.fillStyle = "#800000";
      ctx.fillText("Created by อัพสกิลกับฟุ้ย", canvas.width / 2, 450);

      canvas.toBlob(async (blob) => {
          const file = new File([blob], "my-vehicle.png", { type: "image/png" });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
              try { await navigator.share({ title: 'My Life Vehicle', text: `พาหนะชีวิตของฉันคือ ${message} 🚗 มาประเมินชีวิตของคุณกัน!`, files: [file] }); } catch (error) {}
          } else {
              const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'my-vehicle.png'; link.click();
          }
      }, 'image/png');
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '10px', padding: '20px', backgroundColor: '#fafafa', borderRadius: '15px', border: '1px solid #eee', overflow: 'hidden', position: 'relative' }}>
            <style>{shakeAnimation}</style>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', marginBottom: '15px' }}>
                <h3 style={{color: '#4A0000', margin: 0, fontSize: '15px'}}>🚗 ภาพจำลองสมรรถนะชีวิตของคุณ</h3>
                <button onClick={shareVehicleImage} style={{ backgroundColor: '#fff', border: '1px solid #800000', color: '#800000', padding: '4px 12px', borderRadius: '20px', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold' }}>
                    📤 แชร์รูปรถ
                </button>
            </div>
            
            <div style={{ fontSize: '80px', height: '100px', display: 'flex', alignItems: 'flex-end', animation: `vehicleShake ${shakeIntensity > 0 ? 0.3 : 0}s infinite, vehicleBounce ${speedAnimation} infinite alternate ease-in-out` }}>
                <span style={{ display: 'inline-block', transform: 'scaleX(-1)' }}>{vehicleEmoji}</span>
            </div>

            <div style={{ width: '100%', height: '6px', backgroundColor: '#555', marginTop: '10px', borderRadius: '3px', backgroundImage: 'linear-gradient(90deg, transparent 50%, #FFD166 50%)', backgroundSize: '30px 6px', backgroundRepeat: 'repeat-x', animation: `roadMoveFast ${speedAnimation} linear infinite` }}></div>

            <div style={{ marginTop: '20px', padding: '15px', backgroundColor: `${statusColor}10`, border: `1px solid ${statusColor}50`, borderRadius: '10px', textAlign: 'left', width: '100%', boxSizing: 'border-box' }}>
                <p style={{ color: statusColor, fontWeight: 'bold', fontSize: '15px', margin: '0 0 8px 0', textAlign: 'center' }}>{message}</p>
                <p style={{ fontSize: '12.5px', color: '#555', lineHeight: '1.5', margin: 0 }}>{explanation}</p>
            </div>
        </div>
    );
}

function App() {
  const chartRef = useRef(null);
  const aiResultRef = useRef(null); 
  
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

    const prompt = `คุณคือเพื่อนสนิท ที่ฉลาดและมีความรู้เชิงลึกทั้ง 8 ด้านเป็นสไตล์ที่ปรึกษาอารมณ์จิตแพทย์ สไตล์การพูดคือเป็นกันเอง อบอุ่น จริงใจ ให้กำลังใจ ไม่มีลงท้ายว่า จ๊ะ คะ เรียกแทนคนนั้นว่าคุณ
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

  const saveAIResultImage = async () => {
    if (!aiResultRef.current) return;
    try {
      const canvas = await html2canvas(aiResultRef.current, {
        scale: 2, 
        backgroundColor: '#ffffff', 
        useCORS: true
      });
      const image = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = image;
      link.download = "my-7-day-plan.png";
      link.click();
    } catch (error) {
      console.error("Error saving image:", error);
      alert("เกิดข้อผิดพลาดในการเซฟรูปครับ");
    }
  };

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
    tCtx.fillText("Wheel Of Life Result", tempCanvas.width / 2, 50);

    tCtx.drawImage(canvas, 20, 80);
    
    tCtx.font = "600 20px Kanit";
    tCtx.fillStyle = "#800000";
    tCtx.textAlign = "center";
    tCtx.fillText("Created by อัพสกิลกับฟุ้ย", tempCanvas.width / 2, tempCanvas.height - 25);
    
    tempCanvas.toBlob(async (blob) => {
        const file = new File([blob], "wheel-of-life.png", { type: "image/png" });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            try {
                await navigator.share({
                    title: 'My Wheel of Life',
                    text: `เป้าหมายปีนี้ของฉันคือ: ${futureGoal} 🎯\nมาลองประเมินสมดุลชีวิตกัน!`,
                    files: [file]
                });
            } catch (error) { console.log('Share canceled or failed', error); }
        } else {
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
          <div className="card" style={{ padding: '40px 20px' }}>
            
            <img 
              src="/logo-wheel.png" 
              alt="Wheel Of Life" 
              style={{ 
                width: '100%', 
                maxWidth: '350px', 
                display: 'block', 
                margin: '0 auto 15px auto' 
              }} 
            />

            <p style={{ fontSize: '15px', lineHeight: '1.6', color: '#555', marginBottom: '25px' }}>ประเมินชีวิตปัจจุบัน และตั้งเป้าหมายอัปสกิลชีวิตในอีก 1 ปีข้างหน้า</p>
            <button className="primary-btn" style={{ padding: '14px 30px', fontSize: '16px' }} onClick={() => { setStep('assess_current'); setCurrentScores(Array(8).fill(5)); setTargetScores(Array(8).fill(5)); setSelectedFocusAreas([]); setFutureGoal(""); setAiAnalysis(""); }}>เริ่มประเมิน</button>
          </div>
        )}

        {step === 'assess_current' && (
          <div className="card" style={{ maxWidth: '600px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
              <h2 style={{ margin: 0, fontSize: '18px' }}>ประเมินชีวิตปัจจุบัน</h2><span style={{ fontSize: '11px', backgroundColor: '#800000', color: 'white', padding: '3px 8px', borderRadius: '10px' }}>Step 1/2</span>
            </div>
            <p style={{fontSize:'13px', color:'#666', marginBottom:'20px'}}>ให้คะแนน (0-10) ความพึงพอใจในแต่ละด้าน ณ ปัจจุบัน</p>
            
            <div className="sliders-container" style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: '5px', paddingBottom: '10px' }}>
              {categoriesData.map((item, index) => (
                <div key={item.label} className="slider-group" style={{ 
                  marginBottom: '15px', padding: '16px', backgroundColor: '#fefcfc', border: '1px solid #f0e6e6', borderRadius: '16px', boxShadow: '0 2px 8px rgba(128, 0, 0, 0.04)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap' }}>
                    <label style={{ fontWeight: 'bold', fontSize: '15px', margin: 0, color: '#333' }}>{item.label}</label>
                    <span onClick={() => setShowInfoPopup(index)} style={{ marginLeft: '10px', cursor: 'pointer', color: '#800000', fontSize: '11px', backgroundColor: '#fff5f5', padding: '3px 10px', borderRadius: '15px', border: '1px solid #f08080' }}>ℹ️</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <span style={{ fontSize: '13px', width: '60px', flexShrink: 0 }}>ปัจจุบัน:</span>
                    <input type="range" min="0" max="10" value={currentScores[index]} onChange={(e) => handleScoreChange('current', index, e.target.value)} style={{ accentColor: '#800000', flex: 1 }} />
                    <span style={{ fontWeight: 'bold', width: '25px', color: '#800000', fontSize: '15px', textAlign: 'right' }}>{currentScores[index]}</span>
                  </div>
                </div>
              ))}
            </div>
            <button className="primary-btn" onClick={() => { setTargetScores([...currentScores]); setStep('assess_target'); }} style={{ marginTop: '20px' }}>ตั้งเป้าหมาย 1 ปีข้างหน้า</button>
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
                <div className="sliders-container" style={{ maxHeight: '30vh', overflowY: 'auto', paddingRight: '5px', marginTop: '10px' }}>
                  <h3 style={{fontSize: '13px', color: '#4A0000', marginBottom: '15px', borderBottom: '1px solid #eee', paddingBottom: '8px'}}>ปรับคะแนนเป้าหมายที่คุณเลือก 🎯</h3>
                  {selectedFocusAreas.map((index) => {
                    const item = categoriesData[index];
                    return (
                        <div key={`target-${index}`} className="slider-group" style={{ 
                          marginBottom: '15px', padding: '16px', backgroundColor: '#fefcfc', border: '1px solid #f0e6e6', borderRadius: '16px', boxShadow: '0 2px 8px rgba(128, 0, 0, 0.04)'
                        }}>
                          <label style={{ fontWeight: 'bold', fontSize: '15px', display: 'block', marginBottom: '10px', color: '#333' }}>{item.label} <span style={{fontSize:'11px', color:'#999', fontWeight:'normal'}}>(ปัจจุบัน: {currentScores[index]})</span></label>
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
              >สร้าง Wheel Of Life ของคุณ ✨</button>
            </div>
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
          <div className="card" style={{ position: 'relative', paddingBottom: '60px' }}>
            <img 
              src="/logo-analysis.png" 
              alt="Wheel Of Life Analysis" 
              style={{ width: '100%', maxWidth: '400px', display: 'block', margin: '0 auto 20px auto' }} 
            />
            
            <div style={{ position: 'relative', width: '100%', marginBottom: '20px', backgroundColor: '#ffffff', borderRadius: '24px', border: '2px solid #fff0f0', boxShadow: '0 10px 30px rgba(128, 0, 0, 0.06)', padding: '15px', boxSizing: 'border-box' }}>
              <button onClick={shareChartImage} style={{ position: 'absolute', top: '15px', right: '15px', zIndex: 10, backgroundColor: '#fff5f5', border: '1px solid #ffcccc', color: '#800000', padding: '4px 12px', borderRadius: '20px', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s ease' }}>
                  📤 แชร์รูปกราฟ
              </button>
              <div className="chart-container" style={{ height: isMobile ? '350px' : '500px', marginTop: '5px' }}>
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
                      // ✅ ปรับ layout padding เป็น 0 เพื่อให้กราฟขยายชิดขอบ container มากขึ้น
                      layout: { padding: 0 }, 
                      plugins: { legend: { display: true, position: 'bottom', labels: { usePointStyle: true, font: { family: 'Kanit', size: 11 } } } },
                      // ✅ ลด padding ของ labels ลงเล็กน้อย และปรับขนาด font เพื่อให้ไม่ตกขอบเวลาขยายครับ
                      scales: { r: { min: 0, max: 10, beginAtZero: true, ticks: { display: false }, pointLabels: { padding: 3, font: { family: 'Kanit', size: isMobile ? 11 : 13, weight: '600' }, color: (context) => categoryColors[context.index] } } } 
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

            {aiAnalysis && (() => {
              let beforePlan = aiAnalysis;
              let actionPlan = "";
              let afterPlan = "";

              const planIndex = aiAnalysis.indexOf('📅');
              const fireIndex = aiAnalysis.indexOf('🔥', planIndex);

              if (planIndex !== -1) {
                  beforePlan = aiAnalysis.substring(0, planIndex);
                  actionPlan = fireIndex !== -1 ? aiAnalysis.substring(planIndex, fireIndex) : aiAnalysis.substring(planIndex);
                  afterPlan = fireIndex !== -1 ? aiAnalysis.substring(fireIndex) : "";
              }

              return (
                <div className="ai-result-section">
                  <div className="recommendation" style={{ marginTop: '20px', textAlign: 'left', backgroundColor: '#fff', border: '1px solid #eee', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', padding: '20px', borderRadius: '15px' }}>
                    <div style={{ marginBottom: '10px' }}>
                      <strong style={{ color: '#800000', fontSize: '16px' }}>🪄 ผลวิเคราะห์ด้วย AI </strong>
                    </div>
                    
                    <div>
                      {formatAnalysisText(beforePlan)}
                    </div>

                    {actionPlan && (
                      <div ref={aiResultRef} style={{ position: 'relative', backgroundColor: '#ffffff', padding: '15px 20px', margin: '15px -10px', borderRadius: '15px', border: '2px dashed #ffcccc' }}>
                        <button data-html2canvas-ignore onClick={saveAIResultImage} style={{ position: 'absolute', top: '15px', right: '15px', backgroundColor: '#fff', border: '1px solid #800000', color: '#800000', padding: '4px 12px', borderRadius: '20px', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold' }}>
                          💾 เซฟแผน 7 วัน
                        </button>
                        
                        {formatAnalysisText(actionPlan)}
                        
                        <div style={{ textAlign: 'center', marginTop: '15px', fontSize: '11px', color: '#aaa' }}>
                          Created by อัพสกิลกับฟุ้ย
                        </div>
                      </div>
                    )}

                    <div>
                      {formatAnalysisText(afterPlan)}
                    </div>

                  </div>
                </div>
              );
            })()}

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
   
            {/* ✅ ปุ่มติดตามอัพสกิลกับฟุ้ย มุมขวาล่าง */}
            <a href="https://linktr.ee/upskillwithfuii" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', position: 'absolute', bottom: '15px', right: '15px' }}>
              <button style={{ backgroundColor: '#fff', border: '1px solid #ddd', color: '#666', padding: '6px 12px', borderRadius: '20px', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold' }}>
                📲 ติดตามอัพสกิลกับฟุ้ย
              </button>
            </a>
          </div>
        )}
      </div>
      <Footer /> 
    </div>
  );
}

export default App;