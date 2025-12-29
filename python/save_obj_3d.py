# -*- coding: utf-8 -*-
"""
✅ save_obj_3d.py
- Otsu Thresholding ( 자동 영역 분할)
- Morphology (노이지 제거)
- Gaussian Smoothing (표면 부드럽게..

"""

import argparse # 터미널(CMD)에서 파일 경로를 입력 받기 위해 사용합니다.
import json # 결과(성공 여부, 파일 경로)를 자바/웹 서버에게 알려주기 위한 포맷
import numpy as np # 의료 영상 파일(.nii)을 읽는 핵심 라이브러리 입니다.
import nibabel as nib

# skimage, scipy : 이미지 처리(노이즈 제거, 스무딩, 3D 변환)를 담당하는 수학 도구들입니다.
from skimage import measure, morphology, filters
from scipy.ndimage import gaussian_filter
from skimage.measure import label as cc_label, regionprops
from typing import Optional


# pick_volume 함수 :
"""
목적 : MRI 영상이 가끔 시간 축이 포함되어 4차원(가로x세로x높이x시간)인 경우가 있습니다.
로직 : 우리가 필요한건 3D 형태(모양)뿐이므로, 만약 4차원 데이터가 들어오면 첫 번째 시간대 
([:,:,:,0])만 잘라서 3차원으로 만듭니다. 
요약 : 어떤 형태의 MRI 데이터가 들어오든, 우리 시스템이 처리할 수 있는 딱 1개의 3D(Volume)로 통일시켜 주는 필터
"""
def pick_volume(data: np.ndarray) -> np.ndarray:
    # 함수의 pick_volume 이름입니다. 볼륨(3D 덩어리)을 하나 집어낸다(pick)는 뜻입니다.
    # 4차원 데이터를 3차원 으로 축소..

    """
    (data : np.ndarray)
        입력 받는 변수 이름은 data 입니다.
        np.ndarray는 힌트(Type Hint)입니다. 이 변수에는 파이썬 리스트가 아니라,
        Numpy 배열 (숫자 행렬)이 들어와야 해 라고 명시하는것 입니다.
        -> np.ndarray : 이 함수가 마치고 뱉어내는 결과물(Return) 또한 Numpy 배열이라는 뜻입니다.
    """

    if data.ndim == 3:
        return data
    """
        3차원 데이터일 경우
        data.ndim : Number of DIMensions(차원의 수)의 줄임말 입니다. 배열이 몇 차원인지 알려줍니다.
        == 3 : 가로(X), 세로(Y), 높이(Z) 만 있는 순수한 3D 데이터 인지 확인합니다.
        return data : 우리가 원하는 딱 맞는 형태(3D)이므로, 건드리지 않고 그대로 반환합니다.,
    """

    if data.ndim == 4:
        return data[:, :, :, 0]
    """
        4차원 데이터 일 경우 
        MRI 파일(.nii)은 가끔 4차원일 때가 있습니다. (가로,세로,높이 + 시간 or 채널) 예를 들어, 조영제가 퍼지는
        과정을 찍은 영상은 [가로, 세로, 높이, 시간(Time)] 형태입니다.
            data[:,:,:,0] 분석 (Slicing) : 이 문법은 거대한 4차원 데이터에서 첫 번째 3D 덩어리만 떼어내라는
            명령입니다. 콤마(,)를 기준으로 차원을 나눕니다.
            1. 첫 번째 : -> 가로(X) 축은 전부 다 가져와
            2. 두 번째 : -> 세로(Y) 축은 전부 다 가져와
            3. 세 번째 : -> 높이(Z) 축도 전부 다 가져와
            4. 네 번째 0 : -> 시간(Time) 축에서는 0번 째(첫 번째) 덩어리만 딱 집어와.)
            결과 : 4차원 동영상 같은 데이터에서, 가장 첫 번째 프레임(3D 덩어리) 하나만 똑 떼어내서 3차원 데이터로 만듬
        
    """

    raise ValueError(f"Unsupported NIfTI dimension: {data.ndim}")
    """
        예외 처리
        만약 데이터가 3차원도 아니고, 4차원도 아니라면? (예 : 2차원 사진이거나, 5차원 등 이상한 데이터)
        프로그램을 억지로 돌리면 나중에 고장 나므로, 여기서 ValueError를 발생시켜 강제로 멈춥니다.
        f"..." : "지원하지 않는 차원입니다: 2" 처럼 에러 메시지에 현재 차원 수를 친절하게 적어서 개발자에게 알려줌 
    """



def get_brain_mask(img3d):
    """ Otsu 알고리즘 + 모폴로지 연산으로 뇌 영역만 깔끔하게 추출 """
    # 1. 정규화 (0~1 사이 값으로 변환) : 들쭉날쭉한 밝기를 0~1 사이로 예쁘게 정리하기..
    # 상위 1%와 하위 1% 밝기를 기준으로 잡음 제거
    p1 = np.percentile(img3d, 1)
    p99 = np.percentile(img3d, 99)
    """
        MRI는 기계마다 밝기가 다릅니다. 어떤건 너무 어둡고, 어떤건 핫 픽셀(Hot Pixel)이라고 해서 비정상적으로 밝은 점이 찍힙니다.
        그래서 가장 어두운 1% 와 가장 밝은 1%는 과감히 버리고, 중간 98%의 데이터만 신뢰하겠다는 뜻입니다. (통계적 이상치 제거)
    """

    x = np.clip((img3d - p1) / (p99 - p1 + 1e-6),0,1)
    """
        데이터 값을 최소 0.0에서 최대 1.0 사이의 실수(float)로 압축합니다.
        + 1e-6 : 만약 p99와 p1이 같아서 분모가 0이 되면 에러가 나니깐, 아주 작은수 (0.00001)를 더해줘서 에러를 막는 안전 장치입니다.
        np.clip(..., 0, 1) : 
            계산 결과가 혹시 0보다 작거나 1보다 커지면, 강제로 0과 1로 고정시킵니다.
    """

    # 2. Otsu 임계값 자동 계산 (배경과 물체를 나누는 최적의 선)
    t = filters.threshold_otsu(x) * 0.9 # 0.9는 약간 여유를 둠
    mask = x > t

    """
        오츠 이진화 : 배경(검은색)과 뇌(회색)을 가르는 기준선 찾기
        filters.threshold_otsu(x) : 
            컴퓨터에게 묻습니다. 이 사진에서 어느 밝기를 기준으로 나눠야 배경과 물체가 가장 잘 구분이 될까?
            오츠 알고리즘은 히스토그램(밝기 분포 그래프)을 분석해서 가장 적절한 커트라인(임계값 , t)을 찾아줍니다.
        * 0.9 :
            오츠가 찾은 값이 만약 0.5라면, 0.45로 기준을 살짝 낮춥니다.
            이유 : 기준을 너무 빡빡하게 잡으면 뇌의 가장자리나 어두운 부분이 배경으로 인식되어 잘려 나갈 수 있습니다. 너그럽게(90% 수준) 잡아서 뇌를 살림.
        mask = x > t : 
            기준(t) 보다 밝은 픽셀은 True(뇌), 어두운 픽셀은 False(배경)로 바꿉니다. 이제 이미지는 흑백(True/False)이 됩니다.
    """

    # 3. 노이즈 제거 (모폴로지 연산)
    # 작은 점들을 없애고(Opening), 구멍을 메움(Closing)
    mask = morphology.binary_opening(mask, morphology.ball(1))
    mask = morphology.binary_closing(mask, morphology.ball(2))
    """
        morphology.ball(1) : 
        2D 사진이었다면 disk (원)를 썼겠지만, 이건 3D 데이터니깐 ball(공) 모양의 필터를 사용합니다. 1은 공의 반지름 입니다.
        binary_opening (열기) :
            동작 : 이미지를 깎아내고(Erosion) -> 다시 부풀림(Dilation)
            효과 : 뇌 표면에 붙은 자잘한 털이나, 허공에 떠 있는 아주 작은 먼지들이 깎여 나갈 때 사라집니다.
            (큰 덩어리는 다시 부풀려져서 원상 복구됨) 
    """


    # 4. 가장 큰 덩어리만 남기기 (허공에 떠있는 작은 노이즈 삭제)
    lab = cc_label(mask)
    if lab.max() == 0:
        return mask

    # 영역들의 크기를 계산해서 가장 큰 것 하나만 선택
    regions = regionprops(lab)
    regions.sort(key=lambda r: r.area, reverse=True)
    mask = (lab == regions[0].label)
    """
        cc_label(mask) :
            서로 연결된 덩어리마다 번호를 붙입니다. (예 : 뇌는 1번, 눈알은 2번, 두개골 조각은 3번..)
        regionprops(lab) : 
            각 번호표가 붙은 덩어리들의 정보(면적 위치 등)를 계산합니다.
        regions.sort(...,reverse=True) : 
            덩어리들을 크기(area) 순서대로 정렬합니다.
        mask = (lab == regions[0].label) : 
            MRI 사진에서 가장 큰 덩어리(regions[0])는 무조건 뇌 입니다. 
            그래서 1등 덩어리(뇌)와 번호가 같은 놈만 남기고 나머지는 다 지워라(False)라는 뜻입니다.
             
    """
    return mask
"""
    요약 : 다듬는 과정
    정규화 : 밝기 조정
    오츠 : 뇌와 배경을 대충 분류합니다. 이진화
    모폴로지 : 3D 모델링 표면의 거친 부분을 사포질 합니다. (노이즈 제거)
    라벨링 : 가장 큰 내용만 남기고, 나머지는 제거합니다. (최대 영역 추출)
"""

def write_obj(path: str, verts: np.ndarray, faces: np.ndarray, normals: Optional[np.ndarray] = None):
    with open(path, "w", encoding="utf-8") as f:
        f.write("# Generated by save_obj_3d.py\n")
            # verts : 점 (Vertex)들의 위치 좌표들
            # faces : 점들을 이어서 만든 면들의 정보
            # normals : 빛을 받았을 때 반짝이는 효과를 주기 위한 법선(Normal) 벡터
            # with open(path, "w", encoding="utf-8") :
            # 파일을 쓰기 모드 ("w") 로 엽니다. 만약 파일이 없으면 새로 만들고, 있으면 내용을 덮어씁니다.
            # encoding="utf-8" 한글 경로나 특수 문자가 깨지지 않게 설정합니다.
            # #Generated by ... :
            # OBJ 파일의 첫 줄에 주석(Comment)을 남깁니다. 이 파일은 이 프로그램이 만들었어 라고 꼬리표를 달아주는 것입니다. (필수 아님)

        for v in verts:
            f.write(f"v {v[0]:.4f} {v[1]:.4f} {v[2]:.4f}\n")
            """
                점(Vertex) 좌표쓰기
                v : OBJ 파일에서 이것은 점(Vertex)이다 라는 약속된 기호입니다.
                (v[0].4f) : 점의 X,Y,Z 좌표를 소숫점 4자리까지 (:.4f) 적습니다.
                    예 : v 1.2345 5.6789 -3.0000
                    이렇게 모든 점의 위치를 쭉 나열합니다. 나중에 1번 점, 2번 점 하는 식으로 순서대로 번호가 매겨집니다.
            """

        if normals is not None:
            for n in normals:
                f.write(f"vn {n[0]:.4f} {n[1]:.4f} {n[2]:.4f}\n")
                """
                    법선(Normal) 벡터 쓰기 : 이점은 빛을 이쪽 방향으로 반사해
                    vn : 이것은 법선(Vertex Normal)이다 라는 기호입니다.
                    역할 : 3D 모델이 밋밋하지 않고 입체감 있게 보이려면, 각 점이 어느 방향을 바라보고 있는지 (빛을 어디로 튕겨낼지) 알아야 합니다.
                    그 방향 정보를 기록합니다.
                    주의 : 만약 이 정보가 없으면 (None), 3D 뷰어에서 모델이 종이처럼 평평하거나 이상하게 보일 수 있습니다. 
                """

        for face in faces:
            a, b, c = face + 1
            if normals is not None:
                f.write(f"f {a}//{a} {b}//{b} {c}//{c}\n")
            else:
                f.write(f"f {a} {b} {c}\n")

                """
                    면(Face) 정보 쓰기 (가장 중요!)
                    1번 점, 5번 점, 3번 점을 이어서 삼각형을 만들어라.
                    face + 1 (핵심 포인트) :
                        파이썬(Numpy)은 숫자를 0,1,2.. 이렇게 0부터 셉니다.
                        하지만 OBJ 파일 규격은 1,2,3... 이렇게 1부터 셉니다
                        그래서 파이썬 인덱스에 1을 더해줘야 OBJ 파일이 엉뚱한 점을 연결하지 않습니다.
                    f : 이것은 면(Face)이다 라는 기호입니다. 보통 점 3개를 연결한 삼각형입니다.
                    
                    두가지 포맷
                    법선이 있을 때 (f v//vn): : f 1//1 5//5 3//3 
                        뜻 : 1번 점(1번 법선 사용), 5번 점(5번 법선 사용), 3번 점(3번 법선 사용)을 연결해라.
                        가운데 // 는 텍스쳐 좌표(vt)는 없다는 뜻입니다. (
                    법선이 없을 때 (f v) : f 1 5 3 
                        뜻 : 그냥 1번, 5번, 3번 점 연결해서 삼각형 만들어
                    예시 :                                                             
                    # Generated by save_obj_3d.py
                    v 10.5000 20.1234 5.0000    <-- 1번 점
                    v 11.0000 21.0000 5.1000    <-- 2번 점
                    v 10.8000 19.5000 4.9000    <-- 3번 점
                    ...
                    vn 0.0000 0.0000 1.0000     <-- 1번 법선
                    vn 0.1000 0.2000 0.9000     <-- 2번 법선
                    ...
                    f 1//1 2//2 3//3  <= 1,2,3 번점 과 법선을 이용해 삼각형 하나 생성! 
                    
                    요약 : 이 함수는 복잡한 수학 데이터(배열)를 3D 프로그램(블렌더, 유니티, 웹 뷰어)이 알아들을 수 있는 텍스트 편지로 바꿔줌
            
                """

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--out", required=True)
    # 부드러움 정도 조절 ( 기본값 1.0, 높을수록 뭉개짐)
    parser.add_argument("--sigma", type=float, default=1.0)
    args = parser.parse_args()
    """
        argparse : 파이썬 프로그램을 터미널(CMD)에서 실행할 때 옵션을 받을 수 있게 해주는 도구입니다.
        --input / --out :
            필수(required=True) 입니다. "어떤 파일을 읽어서(input), 어디에 저장할지(out)를 무조건 알려줘야 합니다.
        --sigma :
            선택 사항입니다. 입력하지 않으면 기본값(1.0)을 씁니다.
            사용자가 웹 화면에서 "더 부드럽게" 슬라이더를 조절하면, 이 값을 높여서 파이썬에게 전달할 수 있습니다.       
    """
    # 1. 파일 로드
    nii = nib.load(args.input)
    data = nii.get_fdata()
    vol = pick_volume(data).astype(np.float32)
    vol = np.nan_to_num(vol, nan=0.0, posinf=0.0, neginf=0.0)
    """
        nib.load : .nii 파일을 하드디스크에서 읽어옵니다.
        pick_volume : 4차원 데이터라면 3차원으로 싹둑 잘라서 가져옵니다.
        .astype(np.float32) : 
            데이터 형식을 실수형으로 바꿉니다. 이미지 처리를 하려면 정밀한 계산이 필요하기 때문입니다.
        np.nan_to_num : 
            안전 벨트입니다. 데이터 분석을 하다 보면 0으로 나누기 등으로 인해 Infinity (무한대)나 NaN(숫자 아님) 같은 에러 값이 생길 수 있는데,
            이걸 전부 0.0으로 바꿔서 충돌을 방지합니다.
    """


    # 2. [개선] 뇌 영역 마스크 추출 (잡티 제거)
    mask = get_brain_mask(vol)

    # 마스크가 씌워진 데이터만 남김 ( 배경은 0으로)
    vol_masked = np.zeros_like(vol)
    vol_masked[mask] = vol[mask]

    """
        get_brain_mask(vol) : 
            아까 분석한 똑똑한 지우개 함수를 실행합니다. 잡티가 제거된 깨끗한 마스크(True/False 지도)를 받아옵니다.
        np.zeros_like(vol) : 
            원본(vol)과 똑같은 크기의 검은색 도화지(모두 0인 배열)를 하나 만듭니다.
        vol_masked[mask] = vol[mask] : 
            이 한줄이 마법(Boolean Indexing) 입니다.
            검은 도화지(vol_masked) 위에, 마스크가 True 인 위치(뇌)에만 원본 데이터(vol)를 복사해 붙여넣어라.
            결과적으로 배경은 0(검은색)이고, 뇌만 둥둥 떠 있는 깨끗한 데이터가 됩니다. 
    """

    # 3. [개선] 스무딩
    # 매쉬를 만들기 전에 3D 볼륨 자체를 살짝 흐리게 하면 표면이 매우 매끄러워짐
    # sigma 값이 클수록 더 부드러워짐 ( 보통 0.5 ~ 1.5 사용)
    vol_smooth = gaussian_filter(vol_masked, sigma=args.sigma)

    """
        gaussian_filter :
            3D 공간에서 픽셀(복셀)들을 살짝 뭉갭니다.(Blur).
            이유 : MRI 원본 픽셀은 네모난 깍두기 모양입니다. 이걸 그냥 3D 모델로 만들면 마인크래프트 처럼 각져 보이게됨. 미리 
            살짝 흐리게 만들면 경계면이 부드러워져서, 나중에 곡선이 예쁜 뇌 모델이 나옵니다.
            sigma : 뭉개는 강도입니다. 값이 클수록 더 둥글둥글해집니다.
    """

    # 4. Marching Cubes (3D 모델 생성
    # 스무딩된 데이터에서 0.0 보다 큰 영역의 경계면 추출
    try:
        # level을 아주 낮은 값(예: Otsu결과의 절반)이나 0 근처로 잡음
        verts, faces, normals, _ = measure.marching_cubes(vol_smooth, level=0.1)
        """
            try...except : 
                3D 변환은 수학적으로 복잡해서 가끔 실패할 수 있습니다. 프로그램이 팍! 꺼지는걸 막기 위해 안전장치를 겁니다.
            measure.marching_cubes : 
                스무딩된 데이터(vol_smooth)를 입력으로 넣습니다.
                level = 0.1 : 밝기가 0.1보다 큰 곳을 찾아서 껍데기를 만들어라.
                    아까 배경을 0으로 다 지웠기 때문에, 0.1이라는 아주 낮은 값만 줘도 뇌의 윤곽선을 정확하게 따낼 수 있습니다.
            결과물 :
                verts : 점들의 위치
                faces : 점들을 잇는 삼각형 정보
                normals : 표면의 방향(빛 반사 용도)
        """
        # 5. OBJ 저장
        write_obj(args.out, verts, faces, normals)

        print(json.dumps({
            "ok": True,
            "out": args.out,
            "vertexCount": int(verts.shape[0]),
            "faceCount": int(faces.shape[0])
        }, ensure_ascii=False))

    except Exception as e:
        # 모델 생성 실패 시 에러 JSON 출력
        print(json.dumps({
            "ok": False,
            "error": str(e)
        }, ensure_ascii=False))

        """
            write_obj : 아까 분석함 함수를 호출해 하드디스크에 .obj 파일을 씁니다.
            print(json.dumps(...)) :
                이 부분은 사람이 보라고 찍는게 아닙니다.
                이 파이썬을 실행시킨 웹 서버가 출력을 읽습니다.
                ok : True : "성공했어요!
                out : ... : 파일은 여기에 저장했어요.
                vertexCount : 점은 총 몇개 짜리 모델이에요. (정보 제공용)
            except : 만약 실패하면 ok : False 와 함께 여러 이유 (str(e))를 출력해 줍니다.
            
            전체 요약 :
            main 함수는 **"자동 조각 기계의 컨트롤러"**입니다.

            주문 접수: "A파일을 B로 만들어줘." (argparse)
            재료 손질: 돌(데이터)을 가져와서 씻고 다듬습니다. (load, pick)
            밑그림: 조각할 부분(뇌)만 남기고 나머지는 깎아냅니다. (masking)
            광택 작업: 표면을 부드럽게 사포질합니다. (smoothing)
            조각: 실제 모양을 깎아냅니다. (marching cubes)
            납품: 완성된 조각상을 상자에 담고(write_obj), 영수증을 발행합니다(json print).
        """

if __name__ == "__main__":
    main()
