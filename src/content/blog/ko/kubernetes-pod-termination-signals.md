---
title: "Kubernetes가 내 Pod를 끄는 방법: SIGTERM과 SIGKILL"
description: "Kubernetes는 Pod를 끌 때 먼저 SIGTERM을 보내고, 유예 시간이 지나면 SIGKILL을 보낸다. 배포, 노드 비우기, 선점, probe 실패, 자원 부족, OOM까지 어떤 상황에서 어떤 신호가 오는지 정리하고, PID 1 함정과 SIGTERM을 받은 서버가 해야 할 일을 살펴본다."
pubDate: "2026-11-02T21:00:00+09:00"
tags: ["k8s", "kubernetes", "signal", "graceful-shutdown", "bun"]
socialImage: "../../../assets/blog/kubernetes-pod-termination-signals/og.png"
series: "Kubernetes가 내 Pod를 죽일 때"
---

## 들어가며

배포할 때마다 눈에 걸리는 숫자가 있었다. 새 Pod는 금방 뜨는데 옛 Pod는 꼭 30초를 채우고 나서야 사라졌다. 종료 코드는 137이었다.

137은 128 + 9, 즉 SIGKILL을 받고 끝났다는 뜻이다. 앱이 스스로 끝난 것이 아니라 Kubernetes가 기다리다 못해 강제로 끈 것이다. 원인은 앱에 SIGTERM 처리기가 없어서였다. 처리기가 없는 Bun 서버는 SIGTERM을 받고도 아무 일 없다는 듯 계속 돌았고, Kubernetes는 30초를 기다린 뒤 SIGKILL을 보냈다.

처리기를 넣고 나니 궁금해졌다. 시스템 프로그래밍에서 배운 시그널은 SIGINT, SIGHUP, SIGQUIT처럼 여러 가지다. Kubernetes는 이 가운데 무엇을, 어떤 상황에서 보낼까? 이 글에서는 세 가지를 따라간다.

1. Kubernetes는 Pod를 끌 때 어떤 순서로 신호를 보내는가.
2. 어떤 상황에서 Pod가 꺼지고, 그때 기다려 주는 시간은 얼마인가.
3. SIGTERM을 받은 서버는 무엇을 해야 하는가.

Health Probe가 실패했을 때 Kubernetes가 Pod를 다시 띄우는 이유는 [지난 글](/ko/blog/why-kubernetes-kills-my-pod-health-probes/)에서 다뤘다. 이번 글은 "끄기로 정한 다음"의 이야기다.

## 시그널 다시 보기

시그널은 운영체제가 프로세스에게 보내는 짧은 알림이다. 프로세스는 시그널마다 처리기를 등록해 원하는 일을 할 수 있다. 처리기가 없으면 시그널마다 정해진 기본 동작이 일어난다.

자주 보는 시그널은 이렇다. 번호는 x86 리눅스 기준이다.

| 시그널 | 번호 | 기본 동작 | 처리기 등록 | 흔히 쓰이는 곳 |
| --- | --- | --- | --- | --- |
| SIGHUP | 1 | 종료 | 가능 | 터미널이 끊겼을 때. 데몬은 설정 다시 읽기 신호로 쓴다 |
| SIGINT | 2 | 종료 | 가능 | 터미널에서 Ctrl+C |
| SIGQUIT | 3 | 종료하고 코어 덤프 | 가능 | Ctrl+\\. nginx는 그레이스풀 종료 신호로 쓴다 |
| SIGKILL | 9 | 종료 | <strong>불가</strong> | 무조건 끄기 |
| SIGTERM | 15 | 종료 | 가능 | "이제 정리하고 끝내 달라"는 요청. `kill` 명령의 기본값 |
| SIGSTOP | 19 | 일시 정지 | <strong>불가</strong> | 무조건 멈추기 |

SIGKILL과 SIGSTOP은 처리기를 등록할 수 없다. 프로세스가 무엇을 하고 있든 커널이 바로 끄거나 멈춘다. 그래서 SIGKILL을 받은 프로세스에게는 정리할 기회가 없다.

프로세스가 시그널로 끝나면 셸과 컨테이너 런타임은 종료 코드를 128 + 시그널 번호로 보여준다. SIGTERM으로 끝나면 143, SIGKILL로 끝나면 137이다. 들어가며의 137이 이 숫자다.

Kubernetes가 Pod를 끌 때 쓰는 신호는 사실상 두 개다. 정리하고 끝내 달라고 요청하는 SIGTERM과, 시간이 다 됐을 때 강제로 끄는 SIGKILL이다. SIGINT나 SIGHUP은 보내지 않는다. 다만 SIGTERM 자리에 다른 신호를 보내도록 바꿀 수는 있다. 이것은 뒤에서 다룬다.

## Pod가 꺼지는 순서

`kubectl delete pod`로 Pod 하나를 지운다고 해보자. [공식 문서의 종료 흐름](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#pod-termination)을 따라가면 이렇다.

1. API 서버가 Pod에 삭제 시각과 유예 시간을 기록한다. Pod는 `Terminating` 상태가 된다. 유예 시간은 Pod의 `terminationGracePeriodSeconds`이고 기본값은 30초다.
2. 이 기록을 보고 두 쪽이 <strong>동시에</strong> 움직인다.
   - <strong>노드의 kubelet</strong>은 컨테이너를 끈다. preStop 훅이 있으면 먼저 실행하고, 그다음 컨테이너 런타임에게 각 컨테이너의 첫 프로세스(PID 1)로 SIGTERM을 보내게 한다. 유예 시간이 끝났는데도 남은 프로세스가 있으면 SIGKILL을 보낸다.
   - <strong>컨트롤 플레인</strong>은 트래픽을 뺀다. Service의 EndpointSlice에서 이 Pod의 엔드포인트를 `terminating`으로 표시하고 `ready`를 `false`로 바꾼다. kube-proxy와 로드밸런서는 이 변화를 보고 이 Pod로 새 요청을 보내지 않는다.

<pre class="mermaid">

sequenceDiagram
    accTitle: Pod가 꺼지는 순서
    accDescr: API 서버가 Pod에 삭제 시각을 기록하면, kubelet은 preStop 훅과 SIGTERM을 보내고 유예 시간이 지나면 SIGKILL을 보낸다. 같은 때 컨트롤 플레인은 EndpointSlice에서 이 Pod를 not ready로 바꾸고 로드밸런서는 새 요청을 그만 보낸다.
    participant A as API 서버
    participant K as kubelet
    participant C as 컨테이너 PID 1
    participant E as EndpointSlice·로드밸런서
    A-&gt;&gt;A: 삭제 시각과 유예 시간 기록
    par 노드에서
        A-&gt;&gt;K: Terminating
        K-&gt;&gt;C: preStop 훅 실행
        K-&gt;&gt;C: SIGTERM
        Note over K,C: 유예 시간(기본 30초)이 지나도 남아 있으면
        K-&gt;&gt;C: SIGKILL
    and 컨트롤 플레인에서
        A-&gt;&gt;E: terminating, ready=false
        E-&gt;&gt;E: 이 Pod로 새 요청을 보내지 않음
    end

</pre>

이 순서에서 기억할 것이 세 가지 있다.

<strong>첫째, 유예 시간은 preStop부터 센다.</strong> 공식 문서의 예를 보자. 유예 시간이 60초인데 preStop 훅이 55초 걸리고 앱이 SIGTERM을 받고 끝나는 데 10초가 걸리면, 앱은 끝나기 전에 SIGKILL을 받는다. 55초와 10초를 더하면 60초를 넘기 때문이다. 유예 시간이 끝났는데 preStop 훅이 아직 돌고 있을 때만 kubelet이 딱 한 번 2초를 더 준다.

<strong>둘째, SIGTERM과 트래픽 빼기는 동시에 일어난다.</strong> 트래픽을 다 뺀 다음에 SIGTERM을 보내는 것이 아니다. kube-proxy와 로드밸런서가 엔드포인트 변화를 반영하는 데에는 시간이 걸린다. 그래서 SIGTERM을 받은 뒤에도 몇 초 동안은 새 요청이 들어올 수 있다. SIGTERM을 받자마자 서버를 닫으면 이 요청들이 실패한다.

<strong>셋째, 컨테이너끼리는 순서가 없다.</strong> 한 Pod에 컨테이너가 여럿이면, 사이드카로 지정하지 않는 한 각 컨테이너는 정해지지 않은 순서로 SIGTERM을 받는다. 순서가 중요하면 preStop 훅으로 맞추거나 사이드카 컨테이너를 쓴다.

### SIGTERM 대신 다른 신호를 보내려면

SIGTERM은 기본값일 뿐이다. 컨테이너 이미지의 `STOPSIGNAL`에 다른 신호를 적어 두면 컨테이너 런타임은 그 신호를 보낸다. 적어 두지 않으면 런타임 기본값인 SIGTERM을 보낸다. containerd와 CRI-O 모두 기본값이 SIGTERM이다. 앞의 표에서 본 것처럼 nginx는 SIGQUIT을 그레이스풀 종료로 받기 때문에, 공식 이미지는 `STOPSIGNAL SIGQUIT`을 적어 둔다.

Kubernetes 1.33부터는 Pod 설정에서도 정할 수 있다. 아직 알파 기능이라 `ContainerStopSignals` 기능 게이트를 켜야 하고, Pod에 `spec.os.name`이 있어야 한다. 여기에 적은 신호가 이미지의 `STOPSIGNAL`보다 우선한다.

```yaml
spec:
  os:
    name: linux
  containers:
    - name: web
      image: my-image:latest
      lifecycle:
        stopSignal: SIGUSR1
```

어떤 신호로 바꾸든 유예 시간이 지나면 오는 것은 SIGKILL이다.

## 언제 Pod가 꺼지나

`kubectl delete` 말고도 Pod가 꺼지는 상황은 많다. 대부분은 앞의 순서를 그대로 밟지만, 유예 시간이 다르거나 아예 SIGTERM을 건너뛰는 경우가 있다.

| 상황 | 누가 끄나 | 유예 시간 | 알아 둘 점 |
| --- | --- | --- | --- |
| `kubectl delete pod` | 사람 | Pod 설정(기본 30초). `--grace-period`로 바꿀 수 있다 | |
| 배포(롤링 업데이트), 레플리카 줄이기, HPA 축소 | Deployment 같은 컨트롤러 | Pod 설정 | 가장 흔한 경우다 |
| `kubectl drain`으로 노드 비우기 | Eviction API | Pod 설정 | PodDisruptionBudget을 지킨다 |
| 선점(preemption) | 스케줄러 | Pod 설정 | 우선순위 높은 Pod의 자리를 만든다. PodDisruptionBudget은 최선을 다해 지킬 뿐 보장하지 않는다 |
| liveness·startup probe 실패 | kubelet | Pod 설정. probe에 따로 정할 수도 있다 | Pod는 남고 컨테이너만 다시 띄운다 |
| 노드 자원 부족(소프트 임계값) | kubelet | `evictionMaxPodGracePeriod` 이내. 설정이 없으면 바로 끈다 | Pod의 유예 시간과 PodDisruptionBudget을 지키지 않는다 |
| 노드 자원 부족(하드 임계값) | kubelet | <strong>0초</strong> | 정리할 시간 없이 바로 끈다. 기본 임계값은 남은 메모리 100Mi 등이다 |
| 노드 정상 종료(graceful node shutdown) | kubelet | `shutdownGracePeriod`를 나눠 쓴다 | 두 설정의 기본값이 0이라, 켜 두지 않으면 동작하지 않는다 |
| `kubectl delete --grace-period=0 --force` | 사람 | API에서는 바로 지운다. 노드에서는 아주 짧게 기다린 뒤 강제로 끈다 | |
| 메모리 limit 초과(OOM) | <strong>리눅스 커널</strong> | 없음 | SIGTERM 없이 바로 SIGKILL. 종료 코드 137, 사유 `OOMKilled` |
| 노드 전원이 그냥 꺼짐 | 없음 | 없음 | 신호 자체가 없다. 프로세스는 기계와 함께 사라지고, API의 Pod는 `Terminating`에 남을 수 있다 |

표에서 두 가지를 짚고 가자.

<strong>Pod 설정의 유예 시간이 언제나 지켜지는 것은 아니다.</strong> 배포나 노드 비우기처럼 사람이나 컨트롤러가 끄는 경우에는 지켜진다. 하지만 노드에 메모리나 디스크가 모자라 kubelet이 Pod를 내보낼 때는 Pod 설정을 보지 않는다. 하드 임계값에 걸리면 유예 시간이 0초다.

<strong>OOM은 Kubernetes가 보내는 신호가 아니다.</strong> 컨테이너가 메모리 limit을 넘으면 리눅스 커널의 OOM killer가 SIGKILL로 프로세스를 끈다. kubelet이 끼어들 틈이 없으니 preStop도 SIGTERM도 없다. 그래서 같은 137이라도 원인이 둘이다. 컨테이너 상태의 `lastState.terminated.reason`이 `OOMKilled`면 메모리 limit을, 아니면 유예 시간 안에 끝나지 못한 것을 의심한다.

```sh
kubectl get pod <pod 이름> -o jsonpath='{.status.containerStatuses[*].lastState.terminated}'
```

## PID 1 함정 — 처리기가 없으면 SIGTERM이 사라진다

여기서 들어가며의 이상한 점으로 돌아가 보자. SIGTERM의 기본 동작은 종료다. 그렇다면 처리기가 없어도 앱은 SIGTERM을 받자마자 꺼져야 하지 않을까? 보통 프로세스라면 맞다. 하지만 컨테이너의 첫 프로세스는 다르다.

리눅스는 PID 네임스페이스마다 첫 프로세스(PID 1)를 init으로 대접한다. init이 실수로 죽으면 그 네임스페이스의 프로세스 전체가 무너지기 때문이다. 그래서 커널은 init이 처리기를 등록하지 않은 시그널을 전달하지 않는다. 바깥 네임스페이스에서 보낸 SIGKILL과 SIGSTOP만 예외로 강제 전달한다. [pid_namespaces(7)](https://man7.org/linux/man-pages/man7/pid_namespaces.7.html)에 이 규칙이 나온다.

컨테이너는 자기만의 PID 네임스페이스를 갖고, 이미지의 `CMD`나 `ENTRYPOINT`로 띄운 프로세스가 그 안의 PID 1이 된다. 들어가며의 Bun 서버가 바로 이 자리에 있었다. 그래서 이런 일이 일어났다.

1. 컨테이너 런타임이 Bun 서버(PID 1)에 SIGTERM을 보낸다.
2. SIGTERM 처리기가 없으니 커널이 신호를 버린다. 기본 동작인 종료도 일어나지 않는다.
3. 서버는 아무 일 없다는 듯 요청을 계속 받는다.
4. 30초 뒤 SIGKILL이 온다. 처리 중이던 요청은 끊기고, 종료 코드는 137이다.

앱이 PID 1이 아니게 만드는 방법도 있다. tini 같은 작은 init을 PID 1로 두고 앱을 그 아래에서 띄우거나, Pod에 `shareProcessNamespace: true`를 켜면 된다. 이 설정을 켜면 Pod의 컨테이너들이 PID 네임스페이스를 함께 쓰고, PID 1은 Kubernetes가 넣는 pause 컨테이너가 맡는다. 반대로 셸 형식의 `CMD`로 띄우면 셸이 PID 1이 되고, 셸에 따라서는 신호를 앱까지 넘기지 않는다.

하지만 PID 1에서 벗어나도 문제는 반만 풀린다. 처리기가 없으면 SIGTERM의 기본 동작대로 앱이 그 자리에서 끝나기 때문이다. 앞에서 본 것처럼 SIGTERM 뒤에도 요청은 몇 초 더 들어오고, 처리 중인 요청도 있다. 결국 SIGTERM 처리기는 직접 짜야 한다.

## SIGTERM을 받은 서버가 할 일

가장 먼저 떠오르는 처리기는 이렇다.

```ts
process.on('SIGTERM', () => process.exit(0))
```

PID 1 함정은 피하지만 Pod가 꺼지는 순서와 맞지 않는다. 로드밸런서가 아직 이 Pod로 보내고 있는 요청과, 처리 중이던 요청이 함께 끊긴다.

Pod가 꺼지는 순서에 맞추면 처리기는 네 단계가 된다.

1. <strong>계속 받으며 기다린다.</strong> 로드밸런서가 이 Pod를 빼는 동안 들어오는 요청을 평소처럼 처리한다.
2. <strong>새 연결을 막고 처리 중인 요청을 기다린다.</strong> 끝나지 않는 요청이 있을 수 있으니 상한을 둔다.
3. <strong>남은 것을 내보낸다.</strong> 아직 보내지 않은 trace나 로그, 큐에 쌓인 작업 같은 것이다.
4. <strong>143으로 끝낸다.</strong> SIGTERM으로 끝났다는 표시다(128 + 15).

Bun 서버라면 이렇게 쓸 수 있다. `server.stop()`은 새 연결을 막고, 처리 중인 요청이 모두 끝나면 풀리는 Promise를 돌려준다.

```ts
const server = Bun.serve({ port: 3000, fetch: handle })

process.once('SIGTERM', async () => {
  // 1. 로드밸런서가 이 Pod를 빼는 동안 계속 받는다
  await Bun.sleep(15_000)
  // 2. 새 연결을 막고 처리 중인 요청을 최대 10초 기다린다
  const stopped = await Promise.race([
    server.stop().then(() => true),
    Bun.sleep(10_000).then(() => false),
  ])
  if (!stopped) console.error(`처리 중인 요청 ${server.pendingRequests}건을 기다리지 못했다`)
  // 3. 보내지 않은 trace를 내보낸다. 실패해도 종료는 막지 않는다
  await flushTraces().catch((error) => console.error(error))
  // 4. SIGTERM으로 끝났다는 표시
  process.exit(143)
})
```

숫자는 유예 시간에 맞춰 골랐다. 15초 기다리고 10초 더 기다려도 25초라서, 기본 유예 시간 30초 안에 남은 것을 내보내고 끝낼 수 있다. 10초보다 오래 걸리는 요청이 있는 서버라면 기다리는 상한과 `terminationGracePeriodSeconds`를 같이 늘려야 한다. 한쪽만 늘리면 SIGKILL이 먼저 온다.

실제로 SIGTERM을 보내 보면 순서대로 움직인다. 신호를 보내고 12초 뒤에 보낸 요청도 정상으로 응답했고, 15초째에 trace가 수집기에 도착했고, 프로세스는 143으로 끝났다. 같은 조건에서 3단계를 뺐더니 trace는 하나도 도착하지 않았다.

### 15초는 짐작이다

1단계의 15초는 로드밸런서가 이 Pod를 빼는 데 걸리는 시간을 짐작한 값이다. 실제로 그보다 오래 걸리면 그 뒤로 들어온 요청은 실패한다. 그래서 이 대기를 앱이 아니라 Kubernetes 설정에 두는 방법도 있다. preStop 훅에 sleep을 걸면 kubelet이 그만큼 기다린 뒤에 SIGTERM을 보낸다.

```yaml
lifecycle:
  preStop:
    sleep:
      seconds: 15
```

이렇게 하면 앱은 SIGTERM을 받았을 때 2단계부터 하면 된다. 다만 앞에서 말했듯 preStop 시간도 유예 시간 안에 들어간다. `sleep` 동작은 최근 Kubernetes 버전에서 쓸 수 있으니 클러스터 버전을 먼저 확인하자. 그 전에는 `exec`로 `sleep` 명령을 실행하는 방식을 썼는데, distroless처럼 `sleep` 실행 파일이 없는 이미지에서는 쓸 수 없다.

하나 더 있다. SIGTERM을 받으면 readiness probe가 실패를 돌려주게 하는 코드를 흔히 본다. Pod를 지울 때는 이 코드가 필요 없다. 앞에서 봤듯 Kubernetes가 EndpointSlice의 `ready`를 알아서 `false`로 바꾸기 때문이다. 이 사실은 [probe 문서](https://kubernetes.io/docs/concepts/workloads/pods/probes/)에도 적혀 있다.

## 정리

- Kubernetes가 Pod를 끌 때 쓰는 신호는 SIGTERM과 SIGKILL이다. SIGTERM 자리는 이미지의 `STOPSIGNAL`이나 Pod 설정으로 바꿀 수 있다.
- 순서는 preStop 훅, SIGTERM, 유예 시간이 지나면 SIGKILL이다. 같은 때 EndpointSlice에서 트래픽이 빠진다. 두 일은 동시에 일어나므로 SIGTERM 뒤에도 요청이 들어온다.
- 대부분은 Pod의 유예 시간을 지키지만, 노드 자원 부족은 지키지 않는다. OOM은 커널이 바로 SIGKILL을 보낸다.
- 컨테이너의 PID 1은 처리기가 없는 SIGTERM을 무시한다. 30초 뒤 137로 끝난다면 먼저 처리기부터 확인하자.
- SIGTERM 처리기는 바로 끝내지 말고, 계속 받다가, 닫고 기다리고, 남은 것을 내보낸 뒤 끝낸다. 이 모든 시간의 합이 유예 시간 안에 들어와야 한다.

종료 코드로 거꾸로 읽으면 이렇다.

| 종료 코드 | 뜻 | 먼저 볼 곳 |
| --- | --- | --- |
| 0 | 앱이 스스로 정상 종료했다 | |
| 143 | SIGTERM으로 끝났다(또는 앱이 SIGTERM 처리 후 143으로 끝냈다) | 그레이스풀 종료가 제대로 된 경우다 |
| 137 | SIGKILL로 끝났다 | `reason`이 `OOMKilled`면 메모리 limit, 아니면 SIGTERM 처리기와 유예 시간 |
| 그 밖 | 앱이 오류로 끝났다 | 앱 로그 |
