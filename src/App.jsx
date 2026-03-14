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

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend, whiteBackgroundPlugin);

const categories = [
  'การงาน', 'การเงิน', 'สุขภาพ', 'ความสัมพันธ์', 
  'การพัฒนาตัวเอง', 'การพักผ่อน', 'สภาพแวดล้อม', 'จิตใจ'
];

// --- 2. Dashboard Component ---
function Dashboard({ onBack }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const q = query(collection(db, "user_reports"), orderBy("timestamp", "desc"));
        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setReports(data);
      } catch (error) {
        console.error("Error fetching reports:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  if (loading) return (
    <div className="app-container">
      <div className="card">
        <p>กำลังดึงข้อมูล...</p>
      </div>
    </div>
  );

  return (
    <div className="app-container" style={{ display: 'block', overflowY: 'auto', paddingTop: '40px' }}>
      <div className="card" style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'left' }}>
        <h2 style={{ color: '#800000' }}>📊 Admin Dashboard</h2>
        <p>จำนวนผู้ใช้งานทั้งหมด: <strong>{reports.length}</strong> คน</p>
        <button className="secondary-btn" onClick={onBack} style={{ marginBottom: '20px', width: 'auto', padding: '10px 20px' }}>
          ⬅️ กลับหน้าหลัก
        </button>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ backgroundColor: '#800000', color: 'white' }}>
                <th style={{ padding: '10px' }}>วันที่</th>
                <th style={{ padding: '10px' }}>Email</th>
                <th style={{ padding: '10px' }}>เป้าหมาย</th>
                <th style={{ padding: '10px' }}>คะแนนเฉลี่ย</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '10px' }}>
                    {report.timestamp?.toDate ? report.timestamp.toDate().toLocaleDateString('th-TH') : '-'}
                  </td>
                  <td style={{ padding: '10px', fontWeight: 'bold' }}>{report.email}</td>
                  <td style={{ padding: '10px' }}>{report.goal?.substring(0, 40)}...</td>
                  <td style={{ padding: '10px', textAlign: 'center' }}>
                    {report.scores ? (report.scores.reduce((a, b) => a + b, 0) / 8).toFixed(1) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// --- 3. Main App Component ---
function App() {
  const chartRef = useRef(null);
  const [step, setStep] = useState('home');
  const [scores, setScores] = useState(Array(8).fill(5));
  const [showGraph, setShowGraph] = useState(true);
  const [email, setEmail] = useState('');
  const [futureGoal, setFutureGoal] = useState('');
  const [aiAnalysis, setAiAnalysis] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [isCopied, setIsCopied] = useState(false); // ✅ สถานะการคัดลอก

  useEffect(() => {
    const savedGoal = localStorage.getItem('myFutureGoal');
    if (savedGoal) setFutureGoal(savedGoal);
  }, []);

  useEffect(() => {
    if (aiAnalysis) setAiAnalysis("");
  }, [scores]);

  const handleScoreChange = (index, value) => {
    const newScores = [...scores];
    newScores[index] = parseInt(value);
    setScores(newScores);
  };

  const getRecommendation = () => {
    const minScore = Math.min(...scores);
    const lowestAreas = categories.filter((_, index) => scores[index] === minScore);
    return lowestAreas.join(', ');
  };

  // ✅ ฟังก์ชันคัดลอกข้อความ
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(aiAnalysis);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000); // ให้ปุ่มกลับเป็นปกติหลัง 2 วินาที
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

 const sendReportViaEmail = async () => {
  // 1. เช็คความพร้อมของข้อมูล (ไม่ต้องใช้ Alert)
  if (!import.meta.env.VITE_EMAILJS_SERVICE_ID) {
    console.error("Missing EmailJS Config");
    return;
  }

  if (!email || !futureGoal || !aiAnalysis) {
    return alert("กรุณากรอกข้อมูลให้ครบ และกดวิเคราะห์ AI ก่อนนะครับ");
  }

  try {
    // 2. บันทึกข้อมูลลง Firebase
    await addDoc(collection(db, "user_reports"), {
      email: email,
      scores: scores,
      analysis: aiAnalysis,
      goal: futureGoal,
      timestamp: serverTimestamp(),
      platform: 'upskillwheel_web'
    });

    // 3. เตรียมข้อมูลส่ง Email
    const templateParams = {
      to_email: email,
      analysis_result: aiAnalysis,
      user_goal: futureGoal,
      from_name: "อัพสกิลกับฟุ้ย"
    };

    // 4. ส่งเมลผ่าน EmailJS
    await emailjs.send(
      import.meta.env.VITE_EMAILJS_SERVICE_ID,
      import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
      templateParams,
      import.meta.env.VITE_EMAILJS_PUBLIC_KEY
    );

    // ✅ 5. Alert สุดท้ายเมื่อทุกอย่างสำเร็จ
    alert("🚀 ระบบส่งรีพอร์ตเข้า Email เรียบร้อยแล้วครับ!");

  } catch (error) {
    console.error("Error sending report:", error);
    alert("ขออภัยครับ ระบบขัดข้องเล็กน้อย แต่ข้อมูลของคุณถูกบันทึกไว้แล้วครับ");
  }
};

  const analyzeWithAI = async () => {
    setIsAnalyzing(true);
    const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${API_KEY}`;
    const scoreText = categories.map((cat, i) => `${cat}: ${scores[i]}/10`).join(", ");
    
    const prompt = `ช่วยวิเคราะห์คะแนน Wheel of Life ต่อไปนี้: ${scoreText} 
    โดยใช้ภาษาไทยระดับกึ่งทางการ สุภาพ
    กฎการตอบ:
    1. เริ่มต้นด้วยการทักทายและสรุปภาพรวม 1 ประโยค
    2. แบ่งหัวข้อ "ข้อดี" และ "จุดที่ควรพัฒนา" ให้ชัดเจนโดยการขึ้นบรรทัดใหม่
    3. ให้ 3 คำแนะนำที่ทำได้จริงเป็นข้อๆ (1, 2, 3)
    4. ห้ามใช้ ** หรือ Markdown ใดๆ แต่ให้ใช้การขึ้นบรรทัดใหม่แทนเพื่อความสวยงาม`;

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      const data = await response.json();
      const resultText = data.candidates[0].content.parts[0].text;
      setAiAnalysis(resultText);
    } catch (error) {
      alert("AI ผิดพลาด");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const saveChart = () => {
    if (!chartRef.current) return;
    const canvas = chartRef.current.canvas;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height + 40;
    const tCtx = tempCanvas.getContext('2d');
    tCtx.fillStyle = 'white';
    tCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    tCtx.drawImage(canvas, 0, 0);
    tCtx.font = "500 16px Kanit";
    tCtx.fillStyle = "#800000";
    tCtx.textAlign = "center";
    tCtx.fillText("Created by อัพสกิลกับฟุ้ย", tempCanvas.width / 2, canvas.height + 25);
    const link = document.createElement('a');
    link.href = tempCanvas.toDataURL();
    link.download = 'upskillwheel-chart.png';
    link.click();
  };

  if (showDashboard) return <Dashboard onBack={() => setShowDashboard(false)} />;

  return (
    <div className="app-container" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px 0' }}>
        {/* ส่วนหน้า Home */}
{step === 'home' && (
  <div className="card">
    <h1>Wheel Of Life</h1>
    <p>พร้อมที่จะอัพเกรดและวิเคราะห์ชีวิตในแต่ละด้านหรือยัง?</p>
    <button className="primary-btn" onClick={() => {
        // ✅ เพิ่มการ Reset ค่าตรงนี้ครับ
        setStep('assess');
        setScores(Array(8).fill(5)); // ล้างคะแนน
        setFutureGoal("");           // ล้างเป้าหมาย (Reset จุดนี้!)
        setAiAnalysis("");           // ล้างบทวิเคราะห์เก่า
        setEmail("");                // ล้างเมล (ถ้าต้องการ)
    }}>เริ่มประเมิน</button>
  </div>
)}

        {step === 'assess' && (
          <div className="card">
            <h2>ประเมินสมดุลชีวิต (1-10)</h2>
            <div className="sliders-container">
              {categories.map((cat, index) => (
                <div key={cat} className="slider-group">
                  <label>{cat} <span>{scores[index]}</span></label>
                  <input type="range" min="1" max="10" value={scores[index]} onChange={(e) => handleScoreChange(index, e.target.value)} />
                </div>
              ))}
            </div>
            <button className="primary-btn" onClick={() => setStep('result')}>วิเคราะห์ผลลัพธ์</button>
          </div>
        )}

        {step === 'result' && (
          <div className="card">
            <h2>วิเคราะห์ผลลัพธ์</h2>
            <div className="chart-container">
               <Radar ref={chartRef} data={{
                    labels: categories,
                    datasets: [{ 
                      label: 'คะแนนของคุณ',
                      data: scores, 
                      backgroundColor: 'rgba(128, 0, 0, 0.2)', 
                      borderColor: '#800000',
                      borderWidth: 2,
                      pointBackgroundColor: '#800000'
                    }]
                  }} 
                  options={{ 
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { r: { min: 0, max: 10, beginAtZero: true, ticks: { stepSize: 2, display: true, color: '#ccc' }, pointLabels: { font: { family: 'Kanit', size: 14, weight: '500' } } } }
                  }} />
            </div>
            <button className="secondary-btn" onClick={saveChart}>💾 ดาวน์โหลดรูปกราฟ</button>
            
            <div className="recommendation" style={{
              marginTop: '20px',
              padding: '20px',
              backgroundColor: '#fff5f5',
              borderRadius: '12px',
              border: '1px solid #ffcccc',
              textAlign: 'left',
              position: 'relative' // ✅ สำหรับวางปุ่ม Copy
            }}>
              {!aiAnalysis ? (
                isAnalyzing ? (
                  <div className="ai-loading-container" style={{ textAlign: 'center' }}>
                    <div className="lds-dual-ring"></div>
                    <p className="blinking-text">🪄AI กำลังวิเคราะห์ข้อมูลให้คุณ...</p>
                  </div>
                ) : (
                  <button className="primary-btn" onClick={analyzeWithAI} style={{ width: '100%' }}>
                    ✨ ให้ AI ช่วยวิเคราะห์อย่างละเอียด
                  </button>
                )
              ) : (
                <div className="ai-result-content">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h3 style={{ color: '#800000', margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center' }}>
                      <span style={{ marginRight: '8px' }}>✨</span> ผลวิเคราะห์ Wheel Of Life
                    </h3>
                    {/* ✅ ปุ่มคัดลอกข้อความ */}
                    <button 
                      onClick={handleCopy}
                      style={{
                        padding: '6px 12px',
                        fontSize: '12px',
                        borderRadius: '6px',
                        border: '1px solid #800000',
                        backgroundColor: isCopied ? '#800000' : 'transparent',
                        color: isCopied ? 'white' : '#800000',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      {isCopied ? '✅ คัดลอกแล้ว' : '📄 คัดลอก'}
                    </button>
                  </div>
                  <p style={{ 
                    fontSize: '15px', 
                    lineHeight: '1.7', 
                    color: '#4A0000',
                    whiteSpace: 'pre-line', 
                    margin: 0
                  }}>
                    {aiAnalysis}
                  </p>
                </div>
              )}
            </div>
 <h2>เป้าหมายใน 1 ปีข้างหน้า 🎯</h2>
            <textarea className="goal-input" placeholder="เป้าหมายของคุณ..." value={futureGoal} onChange={(e) => setFutureGoal(e.target.value)} />
            <input type="email" placeholder="Email ของคุณ" value={email} onChange={(e) => setEmail(e.target.value)} className="goal-input" />
            <button className="primary-btn" onClick={sendReportViaEmail}>📧 ส่งสรุปเข้า Email</button>
            <button className="secondary-btn" onClick={() => setStep('home')}>กลับหน้าแรก</button>
          </div>
        )}
      </div>

   <footer style={{ textAlign: 'center', padding: '20px', cursor: 'pointer', color: '#800000' }}>
        Created by อัพสกิลกับฟุ้ย
      </footer>
    </div>
  );
}

export default App;