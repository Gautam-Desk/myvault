import hashlib
import json
import os
import time
from pathlib import Path
import pymupdf as fitz

from database import (
    PDFS_DIR,
    THUMBNAILS_DIR,
    EXPORTS_DIR,
    init_db,
    db_session,
    VAULT_ROOT,
)
from pdf_processor import (
    generate_cover_thumbnail,
    index_pdf_fulltext,
)

SEED_BOOKS = [
    {
        "id": "book-linalg",
        "title": "Linear Algebra & Matrix Calculus",
        "author": "Dr. Elena Rostova",
        "category": "Mathematics & Linear Algebra",
        "shelf": "All Volumes",
        "spine_color": "#7C3222",
        "tags": ["Eigenvalues", "SVD", "Gradients"],
        "pages": [
            {
                "title": "1. Vector Spaces, Span & Linear Independence",
                "subtitle": "Foundational Algebraic Structures in Rn",
                "paragraphs": [
                    "A real vector space V is a set equipped with vector addition and scalar multiplication satisfying eight axioms of associativity, commutativity, identity, and distributivity. In computational mathematics, we predominantly operate within Euclidean space Rn.",
                    "A collection of vectors {v1, v2, ..., vk} is linearly independent if the only solution to the homogeneous equation c1*v1 + c2*v2 + ... + ck*vk = 0 is the trivial solution c1 = c2 = ... = ck = 0."
                ],
                "theorem": "Theorem 1.1 — Basis & Dimension Invariance\nEvery basis of a finite-dimensional vector space V contains the exact same number of vectors, defined as dim(V). Any linearly independent set of size dim(V) automatically spans V.",
                "code": "function isLinearlyIndependent(matrixA) {\n  const rref = computeRREF(matrixA);\n  const rank = rref.filter(r => r.some(v => Math.abs(v) > 1e-9)).length;\n  return rank === matrixA[0].length;\n}"
            },
            {
                "title": "2. Orthogonality, Projections & Gram-Schmidt",
                "subtitle": "Geometric Decomposition & Least Squares",
                "paragraphs": [
                    "Two vectors u, v in Rn are orthogonal when their inner product vanishes: <u, v> = u^T v = 0. Orthonormal bases dramatically simplify coordinate extraction because projections decouple into independent scalar dot products.",
                    "When solving an overdetermined system Ax = b where b is not in Col(A), orthogonal projection onto Col(A) yields the normal equations A^T A x_hat = A^T b, minimizing the squared Euclidean residual ||Ax - b||^2."
                ],
                "theorem": "Definition 2.2 — Orthogonal Projection Matrix\nFor a subspace W spanned by full-column-rank matrix A, the symmetric idempotent projection operator is P = A(A^T A)^(-1) A^T, satisfying P^2 = P and P^T = P.",
                "code": "for (let j = 0; j < n; j++) {\n  let v = columns[j].slice();\n  for (let i = 0; i < j; i++) {\n    const proj = dot(q[i], columns[j]);\n    v = v.map((val, k) => val - proj * q[i][k]);\n  }\n  q[j] = normalize(v);\n}"
            },
            {
                "title": "3. Eigenvalues, Eigenvectors & Spectral Theorem",
                "subtitle": "Invariant Directions of Linear Operators",
                "paragraphs": [
                    "A non-zero vector x is an eigenvector of square matrix A in R^(nxn) with corresponding eigenvalue lambda if Ax = lambda x. Geometrically, A acts along the span of x purely by scaling without rotation.",
                    "Eigenvalues are roots of the characteristic polynomial det(A - lambda I) = 0. The trace tr(A) equals the sum of all eigenvalues, while det(A) equals their product."
                ],
                "theorem": "Theorem 3.1 — The Real Spectral Theorem\nEvery real symmetric matrix A = A^T admits a complete orthonormal basis of eigenvectors with purely real eigenvalues: A = Q Lambda Q^T, where Q^(-1) = Q^T and Lambda = diag(lambda1, ..., lambdan).",
                "code": "let b = randomUnitVector(n);\nfor (let iter = 0; iter < 100; iter++) {\n  b = normalize(matVecMul(A, b));\n}\nconst lambdaMax = dot(b, matVecMul(A, b));"
            },
            {
                "title": "4. Singular Value Decomposition (SVD)",
                "subtitle": "Universal Factorization for Rectangular Matrices",
                "paragraphs": [
                    "Unlike eigendecomposition, which requires square diagonalizable matrices, the Singular Value Decomposition exists for every matrix A in R^(mxn). It factors A = U Sigma V^T into orthogonal matrices U, V and non-negative singular values sigma_1 >= sigma_2 >= ... >= sigma_r > 0.",
                    "By the Eckart-Young-Mirsky theorem, truncating SVD to the top k singular values produces the optimal rank-k approximation in both Frobenius and spectral norms."
                ],
                "theorem": "Theorem 4.1 — Eckart-Young Low-Rank Optimality\nLet A_k = sum_{i=1}^k sigma_i u_i v_i^T. For any matrix B of rank at most k, ||A - A_k||_F <= ||A - B||_F = sqrt(sum_{i=k+1}^r sigma_i^2).",
                "code": "function reconstructRankK(U, S, Vt, k) {\n  return U.map(uRow => Vt[0].map((_, j) =>\n    S.slice(0, k).reduce((acc, s, r) => acc + s * uRow[r] * Vt[r][j], 0)\n  ));\n}"
            },
            {
                "title": "5. Matrix Calculus & Backpropagation Gradients",
                "subtitle": "Jacobians, Hessians & Chain Rule in Tensor Form",
                "paragraphs": [
                    "In high-dimensional optimization, organizing partial derivatives into Jacobian matrices and gradient tensors prevents index clutter. For a scalar loss L(W), the gradient nabla_W L shares the exact shape of parameter matrix W.",
                    "Applying the multivariable chain rule through linear layer Z = XW + b yields clean matrix products: dL/dW = X^T(dL/dZ) and dL/dX = (dL/dZ)W^T."
                ],
                "theorem": "Identity 5.1 — Quadratic Form Gradient\nFor scalar function f(x) = x^T A x + b^T x + c, the gradient is nabla_x f(x) = (A + A^T)x + b. When A is symmetric, this simplifies directly to 2Ax + b.",
                "code": "function linearBackward(dZ, X, W) {\n  return {\n    dW: matMul(transpose(X), dZ),\n    dX: matMul(dZ, transpose(W)),\n    db: sumRows(dZ)\n  };\n}"
            }
        ],
        "flashcards": [
            {
                "front": "What does the Real Spectral Theorem state about symmetric matrices?",
                "back": "Every real symmetric matrix A = A^T can be diagonalized by an orthogonal matrix Q such that A = Q Lambda Q^T with all real eigenvalues.",
                "page": 3,
                "mastered": False
            },
            {
                "front": "Write the Normal Equations for linear least squares minimization of ||Ax - b||^2.",
                "back": "A^T A x_hat = A^T b, giving orthogonal projection matrix P = A(A^T A)^(-1) A^T onto Col(A).",
                "page": 2,
                "mastered": True
            },
            {
                "front": "Why is SVD more general than eigendecomposition?",
                "back": "SVD applies to ANY m x n rectangular matrix A = U Sigma V^T, whereas eigendecomposition only applies to square diagonalizable matrices.",
                "page": 4,
                "mastered": False
            }
        ]
    },
    {
        "id": "book-dsa",
        "title": "Data Structures & Algorithms Handbook",
        "author": "Marcus Chen, M.Sc.",
        "category": "Computer Science & DSA",
        "shelf": "All Volumes",
        "spine_color": "#4F5638",
        "tags": ["Graphs", "Dynamic Programming", "Trees"],
        "pages": [
            {
                "title": "1. Asymptotic Analysis & Amortized Complexity",
                "subtitle": "Worst-Case, Average-Case & Potential Functions",
                "paragraphs": [
                    "Asymptotic notation characterizes algorithm scalability as input size n approaches infinity. Big-O provides an upper bound f(n) = O(g(n)), Big-Omega provides a lower bound, and Big-Theta denotes a tight asymptotic bound.",
                    "Amortized analysis averages the cost of a sequence of operations over time. Using the potential method, dynamic array doubling runs in O(1) amortized time per push."
                ],
                "theorem": "Theorem 1.1 — Master Theorem for Divide & Conquer\nFor recurrence T(n) = aT(n/b) + f(n) with a >= 1, b > 1: if f(n) = Theta(n^(log_b a)), then T(n) = Theta(n^(log_b a) * log n).",
                "code": "function lowerBound(arr, target) {\n  let lo = 0, hi = arr.length;\n  while (lo < hi) {\n    const mid = lo + ((hi - lo) >> 1);\n    arr[mid] < target ? (lo = mid + 1) : (hi = mid);\n  }\n  return lo;\n}"
            },
            {
                "title": "2. Balanced Binary Search Trees",
                "subtitle": "AVL & Red-Black Height Invariants",
                "paragraphs": [
                    "An unbalanced Binary Search Tree can degenerate into a linked list of height O(n) on sorted insertions. Self-balancing trees enforce structural invariants so height stays strictly O(log n).",
                    "AVL trees enforce that left and right subtree heights differ by at most 1, performing single or double tree rotations immediately upon imbalance."
                ],
                "theorem": "Invariant 2.1 — Red-Black Tree Properties\nEvery path from root to null leaf contains the exact same number of black nodes, and no red node may have a red child, guaranteeing height h <= 2 log2(n + 1).",
                "code": "function rotateRight(y) {\n  const x = y.left, T2 = x.right;\n  x.right = y; y.left = T2;\n  updateHeight(y); updateHeight(x);\n  return x;\n}"
            },
            {
                "title": "3. Priority Queues & Dijkstra's Shortest Path",
                "subtitle": "Greedy Graph Relaxation with Binary Heaps",
                "paragraphs": [
                    "Binary min-heaps maintain the heap-order property in a compact flat array where parent(i) = floor((i-1)/2), supporting extractMin and insert in O(log n) time.",
                    "Dijkstra's algorithm computes single-source shortest paths on graphs with non-negative edge weights w(u, v) >= 0 by greedily finalizing the unvisited vertex with minimum tentative distance."
                ],
                "theorem": "Theorem 3.1 — Dijkstra Correctness Invariant\nWhenever a vertex u is popped from the min-priority queue with non-negative edge weights, dist[u] equals the true shortest-path weight delta(s, u).",
                "code": "if (dist[u] + weight < dist[v]) {\n  dist[v] = dist[u] + weight;\n  minHeap.push({ node: v, cost: dist[v] });\n}"
            },
            {
                "title": "4. Dynamic Programming Blueprints",
                "subtitle": "Optimal Substructure & Overlapping Subproblems",
                "paragraphs": [
                    "Dynamic Programming solves optimization problems by decomposing them into overlapping subproblems whose optimal solutions compose cleanly (optimal substructure).",
                    "Bottom-up tabulation fills an iterative DP table in topological dependency order, often allowing O(1) or O(n) space compression."
                ],
                "theorem": "Pattern 4.1 — 0/1 Knapsack Recurrence\ndp[i][w] = max(dp[i-1][w], dp[i-1][w - weight_i] + value_i) for weight_i <= w, running in O(N*W) pseudo-polynomial time.",
                "code": "const dp = new Array(capacity + 1).fill(0);\nfor (const { weight, value } of items) {\n  for (let w = capacity; w >= weight; w--) {\n    dp[w] = Math.max(dp[w], dp[w - weight] + value);\n  }\n}"
            },
            {
                "title": "5. Disjoint Set Union (Union-Find) & MST",
                "subtitle": "Path Compression & Kruskal's Algorithm",
                "paragraphs": [
                    "Disjoint Set Union tracks connected components under dynamic edge additions. Combining union-by-rank with path compression reduces amortized query time to O(alpha(n)).",
                    "Kruskal's Minimum Spanning Tree algorithm sorts edges in ascending weight order and uses DSU to greedily accept edges that connect distinct components."
                ],
                "theorem": "Theorem 5.1 — Cut Property for Minimum Spanning Trees\nFor any cut (S, V-S) of a connected weighted graph, the minimum-weight edge crossing the cut belongs to some Minimum Spanning Tree.",
                "code": "function find(parent, x) {\n  if (parent[x] !== x) parent[x] = find(parent, parent[x]);\n  return parent[x];\n}"
            }
        ],
        "flashcards": [
            {
                "front": "What is the time complexity of Dijkstra's algorithm using a binary min-heap?",
                "back": "O((V + E) log V) time and O(V + E) space, provided all edge weights are non-negative.",
                "page": 3,
                "mastered": False
            },
            {
                "front": "Which two optimizations give Disjoint Set Union O(alpha(n)) amortized operations?",
                "back": "Path compression during find() and union-by-rank during union().",
                "page": 5,
                "mastered": True
            }
        ]
    },
    {
        "id": "book-ml",
        "title": "Foundations of Machine Learning",
        "author": "Prof. Arjun Mehta",
        "category": "AI & Machine Learning",
        "shelf": "All Volumes",
        "spine_color": "#A86B2D",
        "tags": ["Transformers", "Optimization", "Attention"],
        "pages": [
            {
                "title": "1. Empirical Risk Minimization & Generalization",
                "subtitle": "Bias-Variance Decomposition & PAC Bounds",
                "paragraphs": [
                    "Supervised learning seeks a hypothesis h in H minimizing expected population risk R(h). Since the data distribution D is unknown, we minimize empirical risk over finite training sample S.",
                    "Expected squared test error decomposes into irreducible noise, squared bias (underfitting), and estimation variance (overfitting)."
                ],
                "theorem": "Decomposition 1.1 — Bias-Variance Tradeoff\nE[(y - f_hat(x))^2] = Bias[f_hat(x)]^2 + Var[f_hat(x)] + sigma^2.",
                "code": "function crossEntropyLoss(logits, targetIdx) {\n  const maxZ = Math.max(...logits);\n  const sumExp = logits.reduce((s, z) => s + Math.exp(z - maxZ), 0);\n  return -(logits[targetIdx] - maxZ - Math.log(sumExp));\n}"
            },
            {
                "title": "2. Stochastic Gradient Descent & Adam",
                "subtitle": "First-Order Adaptive Optimization Landscapes",
                "paragraphs": [
                    "Mini-batch SGD estimates full gradients using random subsets, injecting gradient noise that helps escape sharp saddle points in non-convex neural landscapes.",
                    "Adam combines exponential moving averages of first moments (momentum) and second uncentered moments (adaptive per-parameter scaling) with bias correction."
                ],
                "theorem": "Update Rule 2.1 — Adam Bias-Corrected Moments\nm_hat = m / (1 - beta1^t),  v_hat = v / (1 - beta2^t),  theta = theta - lr * m_hat / (sqrt(v_hat) + eps).",
                "code": "m = beta1 * m + (1 - beta1) * grad;\nv = beta2 * v + (1 - beta2) * (grad * grad);\ntheta -= lr * (m / (1 - beta1 ** t)) / (Math.sqrt(v / (1 - beta2 ** t)) + 1e-8);"
            },
            {
                "title": "3. Kernel Methods & Support Vector Machines",
                "subtitle": "Maximum Margin Hyperplanes in RKHS",
                "paragraphs": [
                    "Support Vector Machines find the separating hyperplane maximizing geometric margin 2 / ||w|| between classes. Only training samples lying on the margin boundaries determine the decision boundary.",
                    "Via the kernel trick K(x, x') = <phi(x), phi(x')>, SVMs implicitly compute inner products in infinite-dimensional Hilbert spaces."
                ],
                "theorem": "Theorem 3.1 — Mercer's Kernel Condition\nA symmetric function K(x, x') is a valid positive-definite kernel iff its Gram matrix is positive semi-definite for every finite sample.",
                "code": "function rbfKernel(x1, x2, gamma) {\n  const sq = x1.reduce((acc, v, i) => acc + (v - x2[i]) ** 2, 0);\n  return Math.exp(-gamma * sq);\n}"
            },
            {
                "title": "4. Transformers & Self-Attention Mechanisms",
                "subtitle": "Scaled Dot-Product Context Routing",
                "paragraphs": [
                    "Self-attention computes pairwise token interactions across a sequence in O(L^2) time with O(1) sequential path length. Input embeddings are projected into Queries (Q), Keys (K), and Values (V).",
                    "Scaling dot products by 1 / sqrt(d_k) prevents softmax saturation when key dimensionality is large, preserving healthy gradient flow."
                ],
                "theorem": "Equation 4.1 — Scaled Dot-Product Attention\nAttention(Q, K, V) = softmax( (Q K^T) / sqrt(d_k) ) V.",
                "code": "const scale = 1 / Math.sqrt(dK);\nconst weights = matMul(Q, transpose(K)).map(r => softmax(r.map(v => v * scale)));\nconst output = matMul(weights, V);"
            },
            {
                "title": "5. Regularization & Information-Theoretic Bounds",
                "subtitle": "Weight Decay & KL Divergence",
                "paragraphs": [
                    "Regularization constrains effective hypothesis capacity to improve out-of-sample generalization. L2 weight decay penalizes parameter Euclidean norm.",
                    "Kullback-Leibler divergence D_KL(P || Q) quantifies asymmetric information loss when approximating distribution P with Q."
                ],
                "theorem": "Theorem 5.1 — Gibbs' Inequality\nFor any two discrete probability distributions P and Q, D_KL(P || Q) >= 0, with equality iff P(x) = Q(x) everywhere.",
                "code": "function klDivergence(P, Q) {\n  return P.reduce((s, p, i) => p > 0 ? s + p * Math.log(p / Math.max(Q[i], 1e-12)) : s, 0);\n}"
            }
        ],
        "flashcards": [
            {
                "front": "Why are dot products divided by sqrt(d_k) in Scaled Dot-Product Attention?",
                "back": "To prevent large dot products from pushing softmax into regions with vanishingly small gradients.",
                "page": 4,
                "mastered": False
            },
            {
                "front": "Write the Bias-Variance Decomposition of expected squared error.",
                "back": "E[(y - f_hat(x))^2] = Bias[f_hat(x)]^2 + Var[f_hat(x)] + sigma^2.",
                "page": 1,
                "mastered": False
            }
        ]
    },
    {
        "id": "book-os",
        "title": "Operating Systems & Concurrency",
        "author": "Soren Lindqvist",
        "category": "Systems & Architecture",
        "shelf": "All Volumes",
        "spine_color": "#6E3B26",
        "tags": ["Threads", "Virtual Memory", "Deadlocks"],
        "pages": [
            {
                "title": "1. Processes, Threads & Dual-Mode Execution",
                "subtitle": "Hardware Privilege Rings & Context Switching",
                "paragraphs": [
                    "Modern operating systems enforce isolation via hardware privilege modes: User Mode (Ring 3) restricts direct I/O and memory control, while Kernel Mode (Ring 0) executes privileged instructions.",
                    "Threads within the same process share virtual address space and heap, while maintaining private execution stacks and register sets."
                ],
                "theorem": "Mechanism 1.1 — Trap & System Call Lifecycle\nExecuting a syscall triggers a software trap, saving user registers onto the kernel stack, switching to Ring 0, dispatching via the syscall table, and returning via sysret.",
                "code": "const ProcessState = Object.freeze({\n  NEW: 'NEW', READY: 'READY', RUNNING: 'RUNNING', BLOCKED: 'BLOCKED'\n});"
            },
            {
                "title": "2. CPU Scheduling Algorithms",
                "subtitle": "Throughput, Turnaround Time & Interactive Latency",
                "paragraphs": [
                    "CPU schedulers balance competing metrics: maximizing CPU utilization while minimizing turnaround time and interactive response latency.",
                    "Linux's Completely Fair Scheduler (CFS) tracks virtual runtime (vruntime) in a red-black tree, always dispatching the runnable task with smallest vruntime."
                ],
                "theorem": "Theorem 2.1 — SJF Optimality\nShortest Job First (SJF) provably minimizes average waiting time across a fixed set of processes.",
                "code": "function updateVRuntime(task, deltaNs) {\n  task.vruntime += deltaNs * (NICE_0_WEIGHT / task.weight);\n}"
            },
            {
                "title": "3. Concurrency Primitives & Synchronization",
                "subtitle": "Atomic Compare-And-Swap & Condition Variables",
                "paragraphs": [
                    "Race conditions occur when concurrent threads access shared mutable state without synchronization and at least one access is a write.",
                    "Condition variables allow threads to sleep efficiently until a predicate becomes true, always checked inside a while-loop to guard against spurious wakeups."
                ],
                "theorem": "Rule 3.1 — Mesa Semantics Monitor Pattern\nAlways re-verify the predicate in a while(!condition) { cond.wait(mutex); } loop after waking.",
                "code": "await mutex.lock();\nwhile (queue.length === 0) await notEmpty.wait(mutex);\nconst item = queue.shift();\nmutex.unlock();"
            },
            {
                "title": "4. Deadlock Conditions & Prevention",
                "subtitle": "Coffman Conditions & Resource Ordering",
                "paragraphs": [
                    "A set of threads is deadlocked when every thread in the set is waiting for an event that can only be triggered by another thread in the same set.",
                    "Breaking Circular Wait by enforcing a strict global lock acquisition hierarchy eliminates deadlocks cleanly."
                ],
                "theorem": "Theorem 4.1 — The Four Coffman Conditions\nDeadlock requires all four simultaneously: (1) Mutual Exclusion, (2) Hold and Wait, (3) No Preemption, and (4) Circular Wait.",
                "code": "function lockOrdered(a, b) {\n  const [first, second] = a.id < b.id ? [a, b] : [b, a];\n  first.acquire(); second.acquire();\n}"
            },
            {
                "title": "5. Virtual Memory, Paging & TLB Caching",
                "subtitle": "Multi-Level Page Tables & Translation Caching",
                "paragraphs": [
                    "Virtual memory provides every process with a contiguous, isolated address space backed by physical RAM frames.",
                    "CPUs cache recent page translations in the Translation Lookaside Buffer (TLB), achieving over 99% hit rates."
                ],
                "theorem": "Formula 5.1 — Effective Memory Access Time\nEMAT = h * (t_TLB + t_mem) + (1 - h) * (t_TLB + (k + 1) * t_mem).",
                "code": "function parseVAddr(vaddr) {\n  return { vpn: vaddr >>> 12, offset: vaddr & 0xfff };\n}"
            }
        ],
        "flashcards": [
            {
                "front": "Name the four Coffman conditions required for deadlock.",
                "back": "Mutual Exclusion, Hold and Wait, No Preemption, and Circular Wait.",
                "page": 4,
                "mastered": False
            }
        ]
    },
    {
        "id": "book-web",
        "title": "Modern Web Architecture",
        "author": "Nadia Al-Mansoor",
        "category": "Systems & Architecture",
        "shelf": "All Volumes",
        "spine_color": "#563622",
        "tags": ["Distributed Systems", "HTTP/3", "Raft"],
        "pages": [
            {
                "title": "1. Browser Rendering Pipeline & Event Loop",
                "subtitle": "Critical Rendering Path & 16.6ms Frame Budgets",
                "paragraphs": [
                    "To sustain smooth 60fps animations, browsers execute JavaScript, Style, Layout, Paint, and Compositing within 16.67ms.",
                    "The JavaScript event loop drains the entire microtask queue after each macrotask before yielding to rendering."
                ],
                "theorem": "Principle 1.1 — Compositor-Only Properties\nAnimating CSS transform and opacity bypasses Layout and Paint, running directly on the GPU compositor thread.",
                "code": "async function yieldFrame() {\n  return new Promise(r => requestAnimationFrame(r));\n}"
            },
            {
                "title": "2. HTTP/3, QUIC & Zero-RTT Transport",
                "subtitle": "Eliminating Transport Head-of-Line Blocking",
                "paragraphs": [
                    "HTTP/3 runs over QUIC (UDP-based), integrating TLS 1.3 directly into the handshake with independent per-stream loss recovery.",
                    "QUIC identifies connections via a 64-bit Connection ID, enabling seamless Wi-Fi to cellular migration."
                ],
                "theorem": "Advantage 2.1 — Stream Independence\nPacket loss in one QUIC stream stalls only that stream rather than all multiplexed HTTP streams.",
                "code": "const cacheHeaders = { 'Cache-Control': 'public, max-age=31536000, immutable' };"
            },
            {
                "title": "3. Distributed Caching & Consistent Hashing",
                "subtitle": "Cache-Aside & Stampede Mitigation",
                "paragraphs": [
                    "Consistent hashing maps both cache nodes and keys onto a 32-bit hash ring with virtual nodes, remapping only K/N keys on node changes.",
                    "Adding randomized TTL jitter prevents synchronized cache stampedes."
                ],
                "theorem": "Formula 3.1 — Probabilistic Early Expiration\nRecompute early when now - delta * beta * log(rand()) >= expiry.",
                "code": "const jitteredTTL = baseTTL + Math.floor(Math.random() * baseTTL * 0.15);"
            },
            {
                "title": "4. Edge Compute & CDN Routing",
                "subtitle": "Anycast BGP & Stale-While-Revalidate",
                "paragraphs": [
                    "Anycast BGP advertises identical IP prefixes from globally distributed PoPs, routing users to the nearest edge node.",
                    "Stale-while-revalidate serves cached responses immediately while refreshing asynchronously in the background."
                ],
                "theorem": "Pattern 4.1 — Edge Shielding\nTiered origin shields collapse concurrent regional cache misses into a single upstream origin request.",
                "code": "const swr = 'max-age=60, stale-while-revalidate=600';"
            },
            {
                "title": "5. Distributed Consensus & Raft Protocol",
                "subtitle": "Leader Election, Log Replication & Safety",
                "paragraphs": [
                    "Raft decomposes consensus into Leader Election, Log Replication, and Safety.",
                    "A log entry is committed once replicated to a strict majority quorum (floor(N/2) + 1)."
                ],
                "theorem": "Theorem 5.1 — Raft Leader Completeness\nIf a log entry is committed in a given term, it is guaranteed to exist in the logs of all leaders for higher terms.",
                "code": "const hasQuorum = (acks, n) => acks >= Math.floor(n / 2) + 1;"
            }
        ],
        "flashcards": [
            {
                "front": "How does HTTP/3 + QUIC solve TCP Head-of-Line blocking?",
                "back": "QUIC multiplexes independent streams over UDP so packet loss in one stream never stalls others.",
                "page": 2,
                "mastered": False
            }
        ]
    },
    {
        "id": "book-db",
        "title": "Database Internals & Indexing",
        "author": "Dr. Viktor Lindholm",
        "category": "Computer Science & DSA",
        "shelf": "All Volumes",
        "spine_color": "#7C3222",
        "tags": ["B+ Trees", "LSM-Trees", "MVCC", "WAL"],
        "pages": [
            {
                "title": "1. Slotted Page Architecture & Buffer Pools",
                "subtitle": "Fixed-Size 8KB Disk Pages & Clock-Sweep Eviction",
                "paragraphs": [
                    "Relational storage engines organize heap and index files into fixed-size 4KB-16KB pages. Slotted pages store cell pointers at the header and variable-length tuples growing backwards from the footer.",
                    "Buffer pool managers pin hot pages in RAM and use Clock-Sweep (Second-Chance) eviction to avoid expensive disk seeks."
                ],
                "theorem": "Invariant 1.1 — Buffer Pinning Rule\nA buffer frame with pin_count > 0 must never be evicted while an active executor operator holds a pointer into its page.",
                "code": "function findVictimFrame(frames) {\n  while (true) {\n    const f = frames[clockHand];\n    clockHand = (clockHand + 1) % frames.length;\n    if (f.pinCount === 0 && !f.refBit) return f;\n    f.refBit = false;\n  }\n}"
            },
            {
                "title": "2. B+ Trees & Prefix Key Compression",
                "subtitle": "High-Fanout Balanced Disk Indexes",
                "paragraphs": [
                    "B+ Trees store routing keys in internal nodes and all row pointers/payloads in doubly-linked leaf pages, enabling fast range scans.",
                    "With 8KB pages and 16-byte keys, a 3-level B+ Tree indexes over 100 million records in just 3 page reads."
                ],
                "theorem": "Property 2.1 — B+ Tree Occupancy Bound\nEvery non-root node maintains at least ceil(M/2) children, guaranteeing O(log_M N) lookup depth.",
                "code": "function binarySearchSlot(keys, target) {\n  let lo = 0, hi = keys.length - 1;\n  while (lo <= hi) {\n    const mid = (lo + hi) >> 1;\n    if (keys[mid] <= target) lo = mid + 1; else hi = mid - 1;\n  }\n  return hi;\n}"
            },
            {
                "title": "3. LSM-Trees, SSTables & Compaction",
                "subtitle": "Write-Optimized Sequential Storage Engines",
                "paragraphs": [
                    "Log-Structured Merge-Trees buffer mutations in a sorted in-memory MemTable and flush immutable SSTables sequentially.",
                    "Background Leveled or Size-Tiered compaction merges SSTables, discards tombstones, and attaches Bloom filters to skip negative lookups."
                ],
                "theorem": "Formula 3.1 — Bloom Filter Optimal Bit Count\nm = -(n * ln(p)) / (ln 2)^2 bits achieves false-positive rate p for n inserted keys.",
                "code": "function getLSM(key) {\n  if (memTable.has(key)) return memTable.get(key);\n  for (const sst of immutableSSTables) {\n    if (sst.bloomMightContain(key)) {\n      const val = sst.binarySearch(key);\n      if (val !== undefined) return val;\n    }\n  }\n  return null;\n}"
            },
            {
                "title": "4. Write-Ahead Logging (WAL) & ARIES Recovery",
                "subtitle": "Atomicity & Durability via Log Sequence Numbers",
                "paragraphs": [
                    "The Write-Ahead Logging protocol mandates that redo/undo log records be flushed to non-volatile storage before dirty data pages are written to disk.",
                    "ARIES crash recovery executes three passes: Analysis (reconstruct dirty page table), Redo (repeat history from smallest recLSN), and Undo (roll back uncommitted transactions)."
                ],
                "theorem": "Rule 4.1 — Force-Log-at-Commit\nA transaction is durable only once its COMMIT record and all prior LSNs are synced via fsync().",
                "code": "function commitTxn(txnId) {\n  const lsn = wal.append({ txnId, type: 'COMMIT' });\n  wal.flushUpTo(lsn);\n}"
            },
            {
                "title": "5. MVCC & Snapshot Isolation",
                "subtitle": "Non-Blocking Readers & Write-Skew Detection",
                "paragraphs": [
                    "Multi-Version Concurrency Control (MVCC) retains version chains (xmin, xmax) so readers never block writers and writers never block readers.",
                    "Snapshot Isolation prevents dirty reads, non-repeatable reads, and phantoms, though Serializable Snapshot Isolation (SSI) is required to prevent write-skew anomalies."
                ],
                "theorem": "Visibility Rule 5.1 — Snapshot Visibility\nTuple version T is visible to snapshot S iff T.xmin committed before S started and (T.xmax is null or T.xmax > S.xmax).",
                "code": "function isTupleVisible(tuple, snap) {\n  return snap.isCommitted(tuple.xmin) && (!tuple.xmax || !snap.isCommitted(tuple.xmax));\n}"
            }
        ],
        "flashcards": [
            {
                "front": "Why do B+ Trees store data payloads only in leaf nodes rather than internal nodes?",
                "back": "To maximize internal node branching factor (fanout), keeping tree height shallow (3-4 levels) and linking leaves for fast range scans.",
                "page": 2,
                "mastered": False
            },
            {
                "front": "What are the three passes of ARIES crash recovery?",
                "back": "1. Analysis, 2. Redo (repeating history), and 3. Undo (rolling back uncommitted transactions).",
                "page": 4,
                "mastered": True
            }
        ]
    }
]


def create_synthetic_pdf(book_data: dict) -> Path:
    """
    Renders an elegant, scholarly PDF document using PyMuPDF.
    Uses A4 dimensions, clean parchment margins, serif headings, and theorems.
    """
    doc = fitz.open()

    # Cover Page (Page 0)
    cover_page = doc.new_page(width=595, height=842)  # A4 size

    # Background tint
    cover_page.draw_rect(fitz.Rect(0, 0, 595, 842), color=None, fill=(0.98, 0.96, 0.93))

    # Spine strip on left
    r_val = int(book_data["spine_color"][1:3], 16) / 255.0
    g_val = int(book_data["spine_color"][3:5], 16) / 255.0
    b_val = int(book_data["spine_color"][5:7], 16) / 255.0
    spine_rgb = (r_val, g_val, b_val)
    cover_page.draw_rect(fitz.Rect(0, 0, 18, 842), color=None, fill=spine_rgb)

    # Decorative border frame
    cover_page.draw_rect(fitz.Rect(40, 40, 555, 802), color=(0.78, 0.70, 0.60), width=1.5)
    cover_page.draw_rect(fitz.Rect(44, 44, 551, 798), color=(0.85, 0.78, 0.70), width=0.5)

    # Category Pill
    cat_rect = fitz.Rect(60, 80, 260, 104)
    cover_page.draw_rect(cat_rect, color=(0.80, 0.72, 0.62), fill=(0.95, 0.92, 0.88))
    cover_page.insert_text(fitz.Point(70, 96), book_data["category"].upper(), fontsize=9, fontname="helv", color=(0.48, 0.20, 0.13))

    # Title & Author
    cover_page.insert_text(fitz.Point(60, 160), book_data["title"], fontsize=24, fontname="times-bold", color=(0.14, 0.08, 0.05))
    cover_page.insert_text(fitz.Point(60, 200), f"Authored by {book_data['author']}", fontsize=13, fontname="times-italic", color=(0.36, 0.27, 0.21))

    # Decorative rule
    cover_page.draw_line(fitz.Point(60, 225), fitz.Point(535, 225), color=(0.78, 0.48, 0.23), width=1.5)

    # Description & Overview
    overview_text = (
        f"ATHENAEUM ACADEMIC SERIES — VOLUME IDENTIFIER: {book_data['id']}\n\n"
        "A comprehensive, scholarly treatise covering rigorous analytical foundations, computational "
        "proofs, geometric invariants, and concrete implementations designed for advanced study.\n\n"
        "Contents:\n"
    )
    for p_idx, p in enumerate(book_data["pages"]):
        overview_text += f"  • Folio {p_idx + 1}: {p['title']}\n"

    cover_page.insert_textbox(fitz.Rect(60, 250, 535, 620), overview_text, fontsize=11, fontname="times-roman", color=(0.18, 0.12, 0.08))

    # Bottom Seal
    cover_page.draw_line(fitz.Point(60, 740), fitz.Point(535, 740), color=(0.85, 0.78, 0.70), width=0.8)
    cover_page.insert_text(fitz.Point(60, 765), "ATHENAEUM HIGH-DPI STUDY REPOSITORY", fontsize=9, fontname="helv", color=(0.54, 0.43, 0.36))
    cover_page.insert_text(fitz.Point(440, 765), "FOLIO I — COVER", fontsize=9, fontname="helv", color=(0.54, 0.43, 0.36))

    # Content Pages (Pages 1-5)
    for idx, page_data in enumerate(book_data["pages"]):
        page = doc.new_page(width=595, height=842)

        # Page background
        page.draw_rect(fitz.Rect(0, 0, 595, 842), color=None, fill=(0.99, 0.98, 0.96))

        # Header rule
        page.insert_text(fitz.Point(50, 45), book_data["title"].upper(), fontsize=8, fontname="helv", color=(0.54, 0.43, 0.36))
        page.insert_text(fitz.Point(480, 45), f"FOLIO {idx + 1} / {len(book_data['pages'])}", fontsize=8, fontname="helv", color=(0.54, 0.43, 0.36))
        page.draw_line(fitz.Point(50, 55), fitz.Point(545, 55), color=(0.85, 0.80, 0.74), width=0.8)

        # Subtitle & Title
        page.insert_text(fitz.Point(50, 85), page_data["subtitle"].upper(), fontsize=9, fontname="helv", color=(0.78, 0.48, 0.23))
        page.insert_text(fitz.Point(50, 115), page_data["title"], fontsize=18, fontname="times-bold", color=(0.14, 0.08, 0.05))

        # Paragraphs
        y = 145
        for para in page_data["paragraphs"]:
            rect = fitz.Rect(50, y, 545, y + 100)
            page.insert_textbox(rect, para, fontsize=11, fontname="times-roman", color=(0.16, 0.10, 0.06), lineheight=1.4)
            y += 85

        # Theorem Box
        if page_data.get("theorem"):
            th_rect = fitz.Rect(50, y + 10, 545, y + 115)
            # Background
            page.draw_rect(th_rect, color=None, fill=(0.96, 0.93, 0.89))
            # Left accent border
            page.draw_rect(fitz.Rect(50, y + 10, 54, y + 115), color=None, fill=(0.78, 0.38, 0.18))
            page.insert_textbox(fitz.Rect(65, y + 20, 535, y + 105), page_data["theorem"], fontsize=10, fontname="times-italic", color=(0.14, 0.08, 0.05))
            y += 130

        # Code block
        if page_data.get("code"):
            code_rect = fitz.Rect(50, y + 10, 545, y + 120)
            page.draw_rect(code_rect, color=(0.23, 0.15, 0.10), fill=(0.14, 0.08, 0.05))
            page.insert_text(fitz.Point(62, y + 26), "ALGORITHMIC SPECIFICATION:", fontsize=8, fontname="helv", color=(0.88, 0.58, 0.33))
            page.insert_textbox(fitz.Rect(62, y + 36, 535, y + 110), page_data["code"], fontsize=9, fontname="courier", color=(0.95, 0.92, 0.88))

        # Footer rule
        page.draw_line(fitz.Point(50, 785), fitz.Point(545, 785), color=(0.85, 0.80, 0.74), width=0.8)
        page.insert_text(fitz.Point(50, 805), f"{book_data['author']} — Athenaeum Studio", fontsize=8, fontname="helv", color=(0.54, 0.43, 0.36))
        page.insert_text(fitz.Point(510, 805), f"Page {idx + 1}", fontsize=8, fontname="helv", color=(0.54, 0.43, 0.36))

    # Save to temp path, compute SHA256
    temp_pdf = PDFS_DIR / f"seed_{book_data['id']}.pdf"
    doc.save(str(temp_pdf))
    doc.close()

    # Compute SHA-256
    hasher = hashlib.sha256()
    with open(temp_pdf, "rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    sha256 = hasher.hexdigest()

    final_pdf_path = PDFS_DIR / f"{sha256}.pdf"
    if final_pdf_path.exists():
        temp_pdf.unlink()
    else:
        temp_pdf.rename(final_pdf_path)

    return final_pdf_path, sha256


def seed_library():
    """Seeds the 6 academic study volumes into SQLite and creates all vault files."""
    init_db()

    with db_session() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM documents;")
        if cursor.fetchone()[0] > 0:
            print("Library already contains books. Skipping seed.")
            return

    print("Seeding 6 academic volumes into Athenaeum Vault...")
    now = int(time.time() * 1000)

    for idx, b in enumerate(SEED_BOOKS):
        # 1. Generate real PDF with PyMuPDF
        pdf_path, sha256 = create_synthetic_pdf(b)
        file_size = pdf_path.stat().st_size

        # 2. Render 240px WebP thumbnail
        thumb_name = generate_cover_thumbnail(pdf_path, sha256)

        # 3. Insert document record
        page_count = len(b["pages"]) + 1  # Cover + 5 pages = 6 pages
        curr_page = 2 if idx == 0 else 1
        is_starred = 1 if idx in (0, 5) else 0
        tags_json = json.dumps(b["tags"] + [f"{page_count}p"])

        with db_session() as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO documents (
                    id, title, author, category, shelf, sha256,
                    rel_path, thumb_path, spine_color, page_count,
                    current_page, is_starred, last_opened_at, file_size, tags_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
                """,
                (
                    b["id"],
                    b["title"],
                    b["author"],
                    b["category"],
                    b["shelf"],
                    sha256,
                    f"pdfs/{sha256}.pdf",
                    thumb_name,
                    b["spine_color"],
                    page_count,
                    curr_page,
                    is_starred,
                    now - (idx * 60000),
                    file_size,
                    tags_json,
                ),
            )

            # Insert Notes & mirror to exports/
            note_body = (
                f"### {b['title']} — Study Notes\n\n"
                f"**[Page 1]** — Core definitions, algebraic foundations, and notations.\n\n"
                f"**[Page 2]** — Important lemmas and projection properties.\n\n"
                f"> Key Insight: Always verify structural invariants before running optimizations."
            )
            note_id = f"note_{b['id']}"
            cursor.execute(
                """
                INSERT INTO notes (id, doc_id, page_num, markdown_body, updated_at)
                VALUES (?, ?, ?, ?, ?);
                """,
                (note_id, b["id"], 1, note_body, now),
            )

            # Mirror to exports
            safe_title = b["title"].replace(" ", "_").replace("&", "and")
            export_path = EXPORTS_DIR / f"{safe_title}.md"
            with open(export_path, "w", encoding="utf-8") as ef:
                ef.write(f"# {b['title']} — Study Notes\n\n{note_body}")

            # Insert Flashcards
            for fc_idx, fc in enumerate(b.get("flashcards", [])):
                fc_id = f"fc_{b['id']}_{fc_idx + 1}"
                cursor.execute(
                    """
                    INSERT INTO flashcards (
                        id, doc_id, source_page, front_md, back_md,
                        ease_factor, interval_days, due_at, is_mastered
                    ) VALUES (?, ?, ?, ?, ?, 2.5, 1, ?, ?);
                    """,
                    (fc_id, b["id"], fc["page"], fc["front"], fc["back"], now, 1 if fc["mastered"] else 0),
                )

            # Insert initial bookmarks
            cursor.execute(
                """
                INSERT OR IGNORE INTO bookmarks (id, doc_id, page_num, title, created_at)
                VALUES (?, ?, ?, ?, ?);
                """,
                (f"bm_{b['id']}_1", b["id"], 1, "Folio 1 Intro", now),
            )

            conn.commit()

        # 4. Index fulltext into FTS5
        index_pdf_fulltext(b["id"], pdf_path)
        print(f"  ✓ Cataloged & Indexed '{b['title']}' ({page_count} pages)")

    print(f"\nAll 6 volumes successfully seeded into {VAULT_ROOT}!")


if __name__ == "__main__":
    seed_library()
