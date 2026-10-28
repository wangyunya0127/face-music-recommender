<script setup>
const emit = defineEmits(['close'])
</script>

<template>
  <div class="overlay" @click.self="emit('close')">
    <div class="modal">
      <div class="modal-head">
        <h2>📖 算法说明（系统三大核心算法）</h2>
        <button class="x" @click="emit('close')">✕</button>
      </div>
      <div class="modal-body">

        <section>
          <h3>算法一 · 人脸情绪识别（本地 / 端上推理）</h3>
          <p><b>目标：</b>从图片/视频/摄像头/拍照中获取人脸并判定 7 类情绪（平静、快乐、悲伤、愤怒、恐惧、惊喜、厌恶）。</p>
          <ul>
            <li><b>人脸检测：</b>Tiny Face Detector（基于 MobileNet 主干的单阶段 SSD 检测器，输入 224×224）。经典、轻量、实时。</li>
            <li><b>表情分类：</b>FaceExpressionNet（小型 CNN，7 分类 softmax 输出各类置信度）。</li>
            <li><b>本地性：</b>模型权重随站点 <code>/models</code> 目录下发，全部推理在浏览器端完成，<b>图像不上传</b>。</li>
            <li><b>高效性：</b>端侧前向推理，单帧 &lt; 50ms；无需联网调用云端 API。</li>
            <li><b>结果融合：</b>用 7 类置信度对各自情绪坐标 (效价 V、唤醒度 A) 做加权平均，得到平滑的<b>目标情绪坐标</b>，用于后续推荐。</li>
          </ul>
        </section>

        <section>
          <h3>算法二 · 歌曲旋律/曲调情绪识别（Web Audio 离线特征分析）</h3>
          <p><b>目标：</b>对音频（本地合成曲 / 在线预览）分析其旋律情绪，给出 (V, A) 坐标。</p>
          <ul>
            <li><b>RMS 能量</b> → 响度（能量越小越安静）。</li>
            <li><b>能量包络自相关</b> → 速度 tempo（BPM），经典节拍检测法。</li>
            <li><b>STFT 谱质心</b> → 明亮感（音色色彩，高频占比越高越明亮）。</li>
            <li><b>过零率 ZCR</b> → 噪声/粗糙度。</li>
            <li><b>色度旋转搜索</b> → 调式 mode：对 12 维色度做 tonic 旋转，比较<b>大调</b>(0,4,7) 与<b>小调</b>(0,3,7) 三和弦能量，判定大调/小调。</li>
            <li><b>VA 映射：</b>唤醒度←(速度+能量)；效价←(调式正负 + 明亮感)。</li>
            <li><b>分类：</b>由 (V, A) 经<b>最近质心分类器</b>映射到七类情绪。</li>
            <li><b>高效性：</b>仅基础 DSP + 单次基-2 FFT，无深度学习，毫秒级。</li>
          </ul>
        </section>

        <section>
          <h3>算法三 · 推荐策略（内容过滤 + 情绪空间距离排序）</h3>
          <p><b>目标：</b>用「人脸情绪坐标」在「歌曲情绪空间」中检索最匹配曲目。</p>
          <ul>
            <li><b>空间：</b>所有情绪统一映射到二维 (效价 V, 唤醒度 A) 空间。</li>
            <li><b>度量：</b>计算目标坐标与每首歌坐标的<b>欧氏距离</b> d = √[(ΔV)²+(ΔA)²]。</li>
            <li><b>得分：</b>高斯核转换 <code>score = 100·e^(−d)</code>，距离越小匹配度越高。</li>
            <li><b>加成：</b>最近质心情绪标签命中 +6 分，提升 top 稳定性。</li>
            <li><b>排序：</b>按 finalScore 降序取 Top-N；为每首歌生成「目标 vs 歌曲」文字理由，<b>可解释</b>。</li>
            <li><b>高效：</b>单次距离计算 O(1)，整体 O(N)，适合海量曲库；本地曲库由算法二实测坐标，在线曲库由情绪关键词元数据推断坐标，统一进入同一空间。</li>
          </ul>
        </section>

        <section class="pipeline">
          <h3>整体流程</h3>
          <p class="flow">获取人脸 → 算法一(本地识别情绪→目标 VA) → 歌曲库(本地：算法二实测 VA；在线：关键词元数据 VA) → 算法三(情绪空间距离排序) → 推荐列表 + 播放</p>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.overlay { position: fixed; inset: 0; background: rgba(15,20,35,0.55); display: grid; place-items: center; z-index: 50; padding: 20px; }
.modal { background: #fff; border-radius: 16px; width: min(820px, 96vw); max-height: 88vh; overflow: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
.modal-head { display: flex; justify-content: space-between; align-items: center; padding: 16px 22px; border-bottom: 1px solid #eef0f6; position: sticky; top: 0; background: #fff; }
.modal-head h2 { font-size: 18px; margin: 0; }
.x { border: none; background: #f0f2f7; width: 30px; height: 30px; border-radius: 8px; cursor: pointer; font-size: 14px; }
.modal-body { padding: 8px 22px 24px; }
section { margin: 16px 0; }
h3 { font-size: 15px; color: #1f2a44; margin: 0 0 6px; }
p { font-size: 13px; color: #4a5366; line-height: 1.6; margin: 6px 0; }
ul { margin: 6px 0; padding-left: 18px; }
li { font-size: 13px; color: #4a5366; line-height: 1.7; }
code { background: #f0f2f7; padding: 1px 5px; border-radius: 4px; font-size: 12px; }
.flow { background: #f6f8fb; padding: 12px; border-radius: 10px; font-size: 13px; }
.pipeline { border-top: 1px dashed #e3e7ef; padding-top: 8px; }
</style>
