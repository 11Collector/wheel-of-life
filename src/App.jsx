import { useState, useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Radar } from 'react-chartjs-2';
import './App.css';

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

function App() {
  const chartRef = useRef(null);
  const [step, setStep] = useState('home');
  const [scores, setScores] = useState(Array(8).fill(5));
  const [showGraph, setShowGraph] = useState(true);
  const [email, setEmail] = useState('');
  const [futureGoal, setFutureGoal] = useState('');
  const [aiAnalysis, setAiAnalysis] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

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
    if (lowestAreas.length === 1) return lowestAreas[0];
    const lastArea = lowestAreas.pop();
    return `${lowestAreas.join(', ')} และ ${lastArea}`;
  };

  const sendReportViaEmail = () => {
    if (!email) return alert("กรุณาระบุ Email ก่อนส่งนะครับ");
    if (!futureGoal) return alert("กรุณาเขียนเป้าหมายก่อนส่งนะครับ");

    const scoreSummary = categories.map((cat, i) => `- ${cat}: ${scores[i]}/10`).join('\n');
    const subject = encodeURIComponent("สรุปแผนชีวิต Wheel of Life & เป้าหมายอนาคต - อัพสกิลกับฟุ้ย");
    const bodyContent = `สวัสดีครับ นี่คือสรุปรีพอร์ตอัปเกรดชีวิตของคุณ\n\n` +
                        `📊 คะแนน Wheel of Life ปัจจุบัน:\n${scoreSummary}\n\n` +
                        `✨ บทวิเคราะห์จาก AI:\n${aiAnalysis || 'ยังไม่ได้ทำการวิเคราะห์'}\n\n` +
                        `🎯 เป้าหมายในอนาคตที่คุณตั้งไว้:\n${futureGoal}\n\n` +
                        `ขอให้คุณทำสำเร็จตามที่ตั้งใจไว้นะครับ!\n\n` +
                        `Created By อัพสกิลกับฟุ้ย`;
    
    const body = encodeURIComponent(bodyContent).replace(/%0A/g, '%0D%0A');
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
  };

  const analyzeWithAI = async () => {
    setIsAnalyzing(true);
    const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${API_KEY}`;
    
    const scoreText = categories.map((cat, i) => `${cat}: ${scores[i]}/10`).join(", ");
    const prompt = `ช่วยวิเคราะห์คะแนน Wheel of Life: ${scoreText} 
    โดยใช้ภาษาไทยระดับกึ่งทางการ สุภาพและเข้าใจง่าย สรุปให้กระชับที่สุด 
    ห้ามใช้สัญลักษณ์ Markdown เช่น ** หรือเครื่องหมายพิเศษใดๆ ทั้งสิ้น:
    1. ภาพรวมชีวิตปัจจุบัน (สรุปใน 1 ประโยคสั้นๆ)
    2. เหตุผลที่ควรให้ความสำคัญกับด้าน ${getRecommendation()} ในตอนนี้
    3. 3 แนวทางปฏิบัติที่ทำได้จริง (สรุปเป็นข้อ 1), 2), 3) สั้นๆ)
    เน้นเนื้อหาที่ตรงไปตรงมาและประหยัดคำที่สุด`;

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      const resultText = data.candidates[0].content.parts[0].text;
      setAiAnalysis(resultText.replace(/\*\*/g, ''));
    } catch (error) {
      console.error(error);
      alert("เกิดข้อผิดพลาด: " + error.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const copyChart = async () => {
    if (!chartRef.current) return;
    try {
      const canvas = chartRef.current.canvas;
      canvas.toBlob(async (blob) => {
        const item = new ClipboardItem({ "image/png": blob });
        await navigator.clipboard.write([item]);
        alert("📋 คัดลอกรูปกราฟเรียบร้อย!");
      });
    } catch (err) { alert("ไม่สามารถก๊อปปี้รูปได้"); }
  };

  return (
    <div className="app-container" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px 0' }}>
        {step === 'home' && (
          <div className="card">
            <h1 style={{fontSize: '32px'}}>Wheel Of Life</h1>
            <p>พร้อมที่จะอัปเกรดชีวิตและหาสมดุลของคุณหรือยัง?</p>
            <button className="primary-btn" onClick={() => {
                setStep('assess');
                setScores(Array(8).fill(5));
                setFutureGoal(""); 
                setAiAnalysis("");
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
          <div className="card result-card">
            <h2>วิเคราะห์ผลลัพธ์</h2>
            <div className="toggle-group" onClick={() => setShowGraph(!showGraph)}>
              <input type="checkbox" checked={showGraph} readOnly />
              <label>{showGraph ? "แสดงกราฟ Wheel of Life" : "คลิกเพื่อดู Wheel of Life"}</label>
            </div>
            {showGraph && (
              <div className="chart-container" style={{ height: '320px' }}>
                <Radar ref={chartRef} data={{
                    labels: categories,
                    datasets: [{
                      label: 'คะแนนของคุณ',
                      data: scores,
                      backgroundColor: 'rgba(128, 0, 0, 0.2)',
                      borderColor: '#800000',
                      borderWidth: 3,
                      pointBackgroundColor: '#800000',
                      pointRadius: 4,
                    }]
                  }} options={{
                    scales: { r: { min: 0, max: 10, ticks: { display: false }, pointLabels: { font: { family: 'Kanit', size: 14 } } } },
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } }
                  }} />
              </div>
            )}
            {showGraph && (
              <button className="secondary-btn" onClick={copyChart} style={{fontSize: '14px', marginBottom: '20px'}}>
                📸 ก๊อปปี้รูปกราฟเพื่อไปแชร์
              </button>
            )}
            <div className="recommendation">
              {!aiAnalysis ? (
                <button className="primary-btn" onClick={analyzeWithAI} disabled={isAnalyzing} style={{background: '#4A0000'}}>
                  {isAnalyzing ? "🪄 AI กำลังวิเคราะห์..." : "✨ ให้ AI ช่วยวิเคราะห์อย่างละเอียด"}
                </button>
              ) : (
                <div>
                  <strong style={{color: '#800000'}}>✨ AI Analysis:</strong>
                  <p style={{marginTop: '8px', fontSize: '15px', whiteSpace: 'pre-line', textAlign: 'left'}}>{aiAnalysis}</p>
                </div>
              )}
            </div>
            <div className="goals-section" style={{marginTop: '20px', textAlign: 'left', borderTop: '1px solid #eee', paddingTop: '20px'}}>
              <h3 style={{fontSize: '18px', color: '#800000'}}>🎯 เป้าหมายที่ต้องการในอนาคต</h3>
              <textarea 
                className="goal-input" 
                placeholder="เขียนเป้าหมายที่คุณอยากทำให้สำเร็จ..."
                value={futureGoal}
                onChange={(e) => setFutureGoal(e.target.value)}
                style={{width: '100%', minHeight: '100px', marginTop: '10px', padding: '12px', borderRadius: '8px', border: '1px solid #ddd'}}
              />
              <div style={{marginTop: '15px'}}>
                 <label style={{fontSize: '14px', fontWeight: 'bold', color: '#555'}}>ระบุ Email เพื่อรับรีพอร์ตสรุป:</label>
                 <input type="email" placeholder="email@example.com" value={email} onChange={(e) => setEmail(e.target.value)}
                  style={{width: '100%', padding: '12px', marginTop: '5px', borderRadius: '8px', border: '1px solid #ddd'}} />
              </div>
              <button className="primary-btn" onClick={sendReportViaEmail} style={{marginTop: '15px', fontSize: '16px'}}>
                 📧 ส่งเป้าหมายและผลลัพธ์เข้า Email
              </button>
            </div>
            <button className="secondary-btn" onClick={() => setStep('home')} style={{marginTop: '30px'}}>กลับหน้าแรก</button>
          </div>
        )}
      </div>

      {/* --- ส่วน Footer ที่เพิ่มใหม่ --- */}
      <footer style={{ 
        textAlign: 'center', 
        padding: '20px', 
        fontSize: '14px', 
        color: '#800000', 
        fontWeight: '500',
        opacity: '0.8'
      }}>
        Created By อัพสกิลกับฟุ้ย
      </footer>
    </div>
  );
}

export default App;