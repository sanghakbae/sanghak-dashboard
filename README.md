# sanghak.kr · Project Dashboard

[www.sanghak.kr](https://www.sanghak.kr) 메인 대시보드 — GitHub 프로젝트를 실시간으로 모아 보여주는 포털.

## 동작

- 페이지 로드 시 GitHub API(`api.github.com/users/sanghakbae`)에서 프로필과 리포지토리를 가져온다.
- 포크·아카이브 리포는 제외하고 카드로 표시한다.
- 리포의 `homepage`(서브도메인)가 있으면 **LIVE** 배지와 `바로가기` 버튼을 노출한다.
- 검색(이름·설명·태그), 언어 필터, 정렬(업데이트·이름·스타) 지원.

> 인증 없이 GitHub 공개 API를 쓰므로 IP당 시간당 60회 요청 제한이 있다.

## 기술 스택

React 18 + Vite 6 · 단일 페이지, 빌드 결과(`dist/`)는 정적 호스팅 어디든 배포 가능.

## 개발

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # dist/ 생성
npm run preview  # 빌드 결과 미리보기
```

## 배포

`npm run build` 후 `dist/`를 정적 호스팅(GitHub Pages / Firebase Hosting 등)에 올려
`www.sanghak.kr`에 연결한다.
