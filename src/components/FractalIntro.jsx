import './FractalIntro.css'

function FractalIntro() {
  return (
    <div className="fractal-intro">
      <div className="intro-card">
        <h3 className="card-title">🔍 프랙탈과 합동의 관계</h3>
        <p className="card-content">
          프랙탈은 작은 부분이 전체와 똑같은 모양을 가진 특별한 도형이에요.
          <br />
          5학년 때 배운 합동을 기억하나요? 모양과 크기가 똑같은 도형을 합동이라고 했죠!
          <br />
          프랙탈은 큰 도형 안에 작은 합동 도형들이 계속 반복되는 거예요.
          <br />
          마치 겨울 속 거울처럼 끝없이 반복되는 신기한 무늬랍니다!
        </p>
      </div>

      <div className="intro-card">
        <h3 className="card-title">🦋 프랙탈과 대칭의 관계</h3>
        <p className="card-content">
          많은 프랙탈들은 대칭을 가지고 있어요.
          <br />
          선대칭처럼 접었을 때 완전히 겹치거나,
          <br />
          점대칭처럼 180도 돌렸을 때 똑같은 모양이 되는 거죠!
          <br />
          예를 들어, 눈송이 프랙탈은 6개의 가지가 모두 회전 대칭을 이루고 있어요.
          <br />
          60도씩 돌릴 때마다 같은 모양이 나타나요! ❄️
        </p>
      </div>

      <div className="intro-card">
        <h3 className="card-title">🔺 시어핀스키 삼각형</h3>
        <p className="card-content">
          큰 삼각형 안에 작은 합동인 삼각형들이 무한히 반복돼요.
          <br />
          가운데 삼각형을 비워 내고, 남은 삼각형에서 또 가운데를 비우는 식으로 만들죠.
          <br />
          각 작은 삼각형은 원래 삼각형과 모양이 똑같아서
          <br />
          자기닮음(자기유사성)을 가진 프랙탈이에요!
        </p>
      </div>

      <div className="intro-card-row">
        <div className="intro-card-small">
          <h3 className="card-title">🌳 프랙탈 나무</h3>
          <p className="card-content">
            줄기에서 두 가지가 나오는데, 왼쪽과 오른쪽 가지가 거의 선대칭이에요.
            <br />
            그리고 그 가지에서 또 작은 가지들이 똑같은 패턴으로 나와요.
            <br />
            이렇게 가지가 나뉠 때마다 비슷한 모양이 반복되기 때문에
            <br />
            프랙탈 나무라고 불러요.
          </p>
        </div>

        <div className="intro-card-small">
          <h3 className="card-title">❄️ 코흐 눈송이</h3>
          <p className="card-content">
            정삼각형의 각 변을 똑같은 방법으로 나누어
            <br />
            뾰족뾰족한 무늬를 만들어 가요.
            <br />
            6개의 꼭짓점을 중심으로 회전 대칭을 이루고,
            <br />
            모든 부분이 합동인 선분들로 이루어진 프랙탈이에요!
          </p>
        </div>
      </div>
    </div>
  )
}

export default FractalIntro












