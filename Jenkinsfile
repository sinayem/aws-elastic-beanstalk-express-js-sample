// =============================================================================
// Jenkinsfile - CI/CD pipeline for the Express.js sample app
// Flow: Checkout -> Install -> Unit Tests -> Dependency Scan (security gate)
//       -> Build Docker Image -> Push to Docker Hub
// =============================================================================
pipeline {
    // Default agent = Jenkins controller (has Docker CLI, talks to DinD over TLS).
    // Node.js stages override this with a node:16 container agent.
    agent any

    options {
        buildDiscarder(logRotator(numToKeepStr: '20', artifactNumToKeepStr: '10')) // log/artifact retention
        timestamps()                       // timestamp every console line
        timeout(time: 30, unit: 'MINUTES') // never hang forever
        disableConcurrentBuilds()          // one build at a time
        skipDefaultCheckout(true)          // explicit Checkout stage below
    }

    triggers {
        pollSCM('H/2 * * * *')             // poll main branch (webhooks can't reach a localhost-only Jenkins)
    }

    environment {
        IMAGE_NAME     = 'sinayem/aws-express-sample'
        IMAGE_TAG      = "${env.BUILD_NUMBER}"
        REGISTRY_CREDS = 'dockerhub-creds'   // Jenkins credential ID
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
                sh 'git log -1 --pretty=format:"Commit %h by %an: %s"'
            }
        }

        stage('Install Dependencies') {
            agent {
                docker {
                    image 'node:16'
                    args '-e HOME=/tmp'    // writable npm cache for the non-root UID
                    reuseNode true         // same workspace as the controller
                }
            }
            steps {
                sh 'node --version && npm --version'
                sh 'npm ci'
            }
        }

        stage('Unit Tests') {
            agent {
                docker {
                    image 'node:16'
                    args '-e HOME=/tmp'
                    reuseNode true
                }
            }
            steps {
                sh '''
                    npm test > test-results.log 2>&1 || { cat test-results.log; exit 1; }
                    cat test-results.log
                '''
            }
        }

        stage('Dependency Vulnerability Scan') {
            agent {
                docker {
                    image 'node:16'
                    args '-e HOME=/tmp'
                    reuseNode true
                }
            }
            steps {
                sh '''
                    # Full reports are always produced and archived for review
                    npm audit --json > audit-report.json || true
                    npm audit        > audit-report.txt  || true
                    cat audit-report.txt

                    # SECURITY GATE: non-zero exit (build FAILS) on any High/Critical finding
                    npm audit --audit-level=high
                '''
            }
            post {
                failure {
                    echo 'SECURITY GATE FAILED: High/Critical vulnerabilities found. Image will NOT be built or pushed. See audit-report.txt.'
                }
            }
        }

        stage('Build Docker Image') {
            steps {
                sh 'docker version'
                sh 'docker build -t "$IMAGE_NAME:$IMAGE_TAG" -t "$IMAGE_NAME:latest" .'
                sh 'docker image inspect "$IMAGE_NAME:$IMAGE_TAG" > image-info.json'
            }
        }

        stage('Push to Docker Hub') {
            steps {
                withCredentials([usernamePassword(credentialsId: env.REGISTRY_CREDS,
                                                  usernameVariable: 'DOCKER_USER',
                                                  passwordVariable: 'DOCKER_PASS')]) {
                    sh '''
                        echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin
                        docker push "$IMAGE_NAME:$IMAGE_TAG"
                        docker push "$IMAGE_NAME:latest"
                    '''
                }
            }
        }
    }

    post {
        always {
            archiveArtifacts artifacts: 'test-results.log, audit-report.json, audit-report.txt, image-info.json',
                             allowEmptyArchive: true, fingerprint: true
            sh 'docker logout || true'
        }
        success { echo "Pipeline succeeded: pushed ${IMAGE_NAME}:${IMAGE_TAG}" }
        failure { echo 'Pipeline failed: check the stage logs and archived reports.' }
    }
}
