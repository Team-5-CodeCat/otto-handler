/**
 * React Flow Node 데이터 구조 (제네릭 타입)
 * T: 커스텀 data 타입 (기본값: Record<string, any>)
 */
export interface FlowNode<T = Record<string, any>> {
  /**
   * 노드 고유 ID
   */
  id: string;

  /**
   * 노드 타입 (input, output, custom 등)
   */
  type?: string;

  /**
   * 노드 위치
   */
  position: {
    x: number;
    y: number;
  };

  /**
   * 노드 데이터 (커스텀 속성들)
   * React Flow에서 자유롭게 정의할 수 있는 데이터
   */
  data: T;

  /**
   * 노드 스타일
   */
  style?: Record<string, any>;

  /**
   * 드래그 가능 여부
   */
  draggable?: boolean;

  /**
   * 선택 가능 여부
   */
  selectable?: boolean;
}

/**
 * React Flow Edge 데이터 구조
 */
export interface FlowEdge {
  /**
   * 엣지 고유 ID
   */
  id: string;

  /**
   * 시작 노드 ID
   */
  source: string;

  /**
   * 종료 노드 ID
   */
  target: string;

  /**
   * 시작 노드의 핸들 ID
   */
  sourceHandle?: string;

  /**
   * 종료 노드의 핸들 ID
   */
  targetHandle?: string;

  /**
   * 엣지 타입
   */
  type?: string;

  /**
   * 엣지 라벨
   */
  label?: string;

  /**
   * 엣지 스타일
   */
  style?: Record<string, any>;

  /**
   * 엣지가 애니메이션 되는지 여부
   */
  animated?: boolean;
}

/**
 * React Flow 전체 데이터 구조 (파이프라인 데이터)
 * T: 커스텀 노드 data 타입 (기본값: Record<string, any>)
 */
export interface PipelineFlowData<T = Record<string, any>> {
  /**
   * 노드 배열
   */
  nodes: FlowNode<T>[];

  /**
   * 엣지 배열
   */
  edges: FlowEdge[];

  /**
   * 뷰포트 설정
   */
  viewport?: {
    x: number;
    y: number;
    zoom: number;
  };
}

/**
 * 파이프라인 노드 데이터 예시 (선택적 사용)
 * 필요에 따라 이 타입을 참고하여 data 필드를 구성할 수 있습니다.
 */
export interface PipelineNodeDataExample {
  /**
   * 노드 라벨/이름
   */
  label: string;

  /**
   * 파이프라인 단계 타입
   */
  stepType?: 'BUILD' | 'TEST' | 'DEPLOY' | 'CUSTOM';

  /**
   * 실행할 명령어나 스크립트
   */
  command?: string;

  /**
   * 환경 변수
   */
  env?: Record<string, string>;

  /**
   * 추가 설정
   */
  config?: Record<string, any>;
}
